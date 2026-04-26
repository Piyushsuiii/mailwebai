import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import Account from "@/lib/account";
import { syncEmailsToDatabase } from "@/lib/sync-to-db";
import { db } from "@/server/db";
import { getEmailDetails } from "@/lib/aurinko";
import type { Prisma } from "@prisma/client";
import { emailAddressSchema } from "@/lib/types";
import { FREE_CREDITS_PER_DAY } from "@/app/constants";
import {
    getCachedThreads, setCachedThreads,
    getCachedThread, setCachedThread,
    getCachedThreadCount, setCachedThreadCount,
    getCachedAccounts, setCachedAccounts,
    invalidateThreadCaches, invalidateSingleThread,
} from "@/lib/email-cache";

export const authoriseAccountAccess = async (accountId: string, userId: string) => {
    const account = await db.account.findFirst({
        where: {
            id: accountId,
            userId: userId,
        },
        select: {
            id: true, emailAddress: true, name: true, token: true
        }
    })
    if (!account) throw new Error("Invalid token")
    return account
}

const inboxFilter = (accountId: string): Prisma.ThreadWhereInput => ({
    accountId,
    inboxStatus: true
})

const sentFilter = (accountId: string): Prisma.ThreadWhereInput => ({
    accountId,
    sentStatus: true
})

const draftFilter = (accountId: string): Prisma.ThreadWhereInput => ({
    accountId,
    draftStatus: true
})

export const mailRouter = createTRPCRouter({
    getAccounts: protectedProcedure.query(async ({ ctx }) => {
        // Try cache first
        const cached = await getCachedAccounts<{ id: string; emailAddress: string; name: string }[]>(ctx.auth.userId);
        if (cached) return cached;

        const accounts = await ctx.db.account.findMany({
            where: {
                userId: ctx.auth.userId,
            }, select: {
                id: true, emailAddress: true, name: true
            }
        })
        await setCachedAccounts(ctx.auth.userId, accounts);
        return accounts;
    }),
    getNumThreads: protectedProcedure.input(z.object({
        accountId: z.string(),
        tab: z.string()
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)

        // Try cache first
        const cached = await getCachedThreadCount(account.id, input.tab);
        if (cached !== null) return cached;

        let filter: Prisma.ThreadWhereInput = {}
        if (input.tab === "inbox") {
            filter = inboxFilter(account.id)
        } else if (input.tab === "sent") {
            filter = sentFilter(account.id)
        } else if (input.tab === "drafts") {
            filter = draftFilter(account.id)
        }
        const count = await ctx.db.thread.count({
            where: filter
        })
        await setCachedThreadCount(account.id, input.tab, count);
        return count;
    }),
    getThreads: protectedProcedure.input(z.object({
        accountId: z.string(),
        tab: z.string(),
        done: z.boolean(),
        // Optional filter params
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        sender: z.string().optional(),
        keyword: z.string().optional(),
        readStatus: z.enum(['all', 'read', 'unread']).optional(),
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)

        // Determine if this is a "default" view (no active filters)
        const isDefaultView = !input.dateFrom && !input.dateTo && !input.sender && !input.keyword && (!input.readStatus || input.readStatus === 'all');

        // Try cache for default views only
        if (isDefaultView) {
            const cached = await getCachedThreads(account.id, input.tab, input.done);
            if (cached) return cached;
        }

        let filter: Prisma.ThreadWhereInput = {}
        if (input.tab === "inbox") {
            filter = inboxFilter(account.id)
        } else if (input.tab === "sent") {
            filter = sentFilter(account.id)
        } else if (input.tab === "drafts") {
            filter = draftFilter(account.id)
        }

        filter.done = {
            equals: input.done
        }

        // Apply optional filters
        const andClauses: Prisma.ThreadWhereInput[] = []

        if (input.dateFrom || input.dateTo) {
            const dateFilter: any = {}
            if (input.dateFrom) dateFilter.gte = new Date(input.dateFrom)
            if (input.dateTo) {
                const endDate = new Date(input.dateTo)
                endDate.setDate(endDate.getDate() + 1)
                dateFilter.lte = endDate
            }
            filter.lastMessageDate = dateFilter
        }

        if (input.sender) {
            andClauses.push({
                emails: {
                    some: {
                        from: {
                            OR: [
                                { name: { contains: input.sender, mode: 'insensitive' } },
                                { address: { contains: input.sender, mode: 'insensitive' } },
                            ],
                        },
                    },
                },
            })
        }

        if (input.keyword) {
            andClauses.push({
                emails: {
                    some: {
                        OR: [
                            { bodySnippet: { contains: input.keyword, mode: 'insensitive' } },
                            { subject: { contains: input.keyword, mode: 'insensitive' } },
                        ],
                    },
                },
            })
        }

        if (input.readStatus === 'unread') {
            andClauses.push({
                emails: {
                    some: {
                        sysLabels: { hasSome: ['unread'] },
                    },
                },
            })
        } else if (input.readStatus === 'read') {
            andClauses.push({
                NOT: {
                    emails: {
                        some: {
                            sysLabels: { hasSome: ['unread'] },
                        },
                    },
                },
            })
        }

        if (andClauses.length > 0) {
            filter.AND = andClauses
        }

        const threads = await ctx.db.thread.findMany({
            where: filter,
            include: {
                emails: {
                    orderBy: {
                        sentAt: "asc"
                    },
                    select: {
                        from: true,
                        body: true,
                        bodySnippet: true,
                        emailLabel: true,
                        subject: true,
                        sysLabels: true,
                        id: true,
                        sentAt: true
                    }
                }
            },
            take: 50,
            orderBy: {
                lastMessageDate: "desc"
            }
        })

        // Cache default views for next request
        if (isDefaultView) {
            await setCachedThreads(account.id, input.tab, input.done, threads);
        }

        return threads
    }),

    getThreadById: protectedProcedure.input(z.object({
        accountId: z.string(),
        threadId: z.string()
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)

        // Try cache first
        const cached = await getCachedThread(account.id, input.threadId);
        if (cached) return cached;

        const thread = await ctx.db.thread.findUnique({
            where: { id: input.threadId },
            include: {
                emails: {
                    orderBy: {
                        sentAt: "asc"
                    },
                    select: {
                        from: true,
                        body: true,
                        subject: true,
                        bodySnippet: true,
                        emailLabel: true,
                        sysLabels: true,
                        id: true,
                        sentAt: true
                    }
                }
            },
        })
        if (thread) {
            await setCachedThread(account.id, input.threadId, thread);
        }
        return thread;
    }),

    getReplyDetails: protectedProcedure.input(z.object({
        accountId: z.string(),
        threadId: z.string(),
        replyType: z.enum(['reply', 'replyAll'])
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)

        const thread = await ctx.db.thread.findUnique({
            where: { id: input.threadId },
            include: {
                emails: {
                    orderBy: { sentAt: 'asc' },
                    select: {
                        from: true,
                        to: true,
                        cc: true,
                        bcc: true,
                        sentAt: true,
                        subject: true,
                        internetMessageId: true,
                    },
                },
            },
        });

        if (!thread || thread.emails.length === 0) {
            throw new Error("Thread not found or empty");
        }

        const lastExternalEmail = thread.emails
            .reverse()
            .find(email => email.from.id !== account.id);

        if (!lastExternalEmail) {
            throw new Error("No external email found in thread");
        }

        const allRecipients = new Set([
            ...thread.emails.flatMap(e => [e.from, ...e.to, ...e.cc]),
        ]);

        if (input.replyType === 'reply') {
            return {
                to: [lastExternalEmail.from],
                cc: [],
                from: { name: account.name, address: account.emailAddress },
                subject: `${lastExternalEmail.subject}`,
                id: lastExternalEmail.internetMessageId
            };
        } else if (input.replyType === 'replyAll') {
            return {
                to: [lastExternalEmail.from, ...lastExternalEmail.to.filter(addr => addr.id !== account.id)],
                cc: lastExternalEmail.cc.filter(addr => addr.id !== account.id),
                from: { name: account.name, address: account.emailAddress },
                subject: `${lastExternalEmail.subject}`,
                id: lastExternalEmail.internetMessageId
            };
        }
    }),

    syncEmails: protectedProcedure.input(z.object({
        accountId: z.string()
    })).mutation(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        if (!account) throw new Error("Invalid token")
        const acc = new Account(account.token)
        await acc.syncEmails()
        // Bust thread caches — new emails arrived
        await invalidateThreadCaches(account.id)
    }),
    setUndone: protectedProcedure.input(z.object({
        threadId: z.string().optional(),
        threadIds: z.array(z.string()).optional(),
        accountId: z.string()
    })).mutation(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        if (!account) throw new Error("Invalid token")
        if (input.threadId) {
            await ctx.db.thread.update({
                where: {
                    id: input.threadId
                },
                data: {
                    done: false
                }
            })
        }
        if (input.threadIds) {
            await ctx.db.thread.updateMany({
                where: {
                    id: {
                        in: input.threadIds
                    }
                },
                data: {
                    done: false
                }
            })
        }
        // Bust thread list caches — done status changed
        await invalidateThreadCaches(account.id)
    }),
    setDone: protectedProcedure.input(z.object({
        threadId: z.string().optional(),
        threadIds: z.array(z.string()).optional(),
        accountId: z.string()
    })).mutation(async ({ ctx, input }) => {
        if (!input.threadId && !input.threadIds) throw new Error("No threadId or threadIds provided")
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        if (!account) throw new Error("Invalid token")
        if (input.threadId) {
            await ctx.db.thread.update({
                where: {
                    id: input.threadId
                },
                data: {
                    done: true
                }
            })
        }
        if (input.threadIds) {
            await ctx.db.thread.updateMany({
                where: {
                    id: {
                        in: input.threadIds
                    }
                },
                data: {
                    done: true
                }
            })
        }
        // Bust thread list caches — done status changed
        await invalidateThreadCaches(account.id)
    }),
    markThreadAsRead: protectedProcedure.input(z.object({
        accountId: z.string(),
        threadId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        // Remove "unread" from sysLabels array for all emails in this thread
        await ctx.db.$executeRaw`
            UPDATE "Email"
            SET "sysLabels" = array_remove("sysLabels", 'unread')
            WHERE "threadId" = ${input.threadId}
            AND 'unread' = ANY("sysLabels")
        `
        // Bust caches — read status changed
        await invalidateSingleThread(account.id, input.threadId)
        await invalidateThreadCaches(account.id)
    }),
    getEmailDetails: protectedProcedure.input(z.object({
        emailId: z.string(),
        accountId: z.string()
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        return await getEmailDetails(account.token, input.emailId)
    }),
    sendEmail: protectedProcedure.input(z.object({
        accountId: z.string(),
        body: z.string(),
        subject: z.string(),
        from: emailAddressSchema,
        to: z.array(emailAddressSchema),
        cc: z.array(emailAddressSchema).optional(),
        bcc: z.array(emailAddressSchema).optional(),
        replyTo: emailAddressSchema,
        inReplyTo: z.string().optional(),
        threadId: z.string().optional(),
        attachments: z.array(z.object({
            name: z.string(),
            mimeType: z.string(),
            content: z.string(),
            inline: z.boolean().optional(),
            contentId: z.string().optional(),
        })).optional(),
    })).mutation(async ({ ctx, input }) => {
        const acc = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        const account = new Account(acc.token)
        console.log('sendmail', input)
        await account.sendEmail({
            body: input.body,
            subject: input.subject,
            threadId: input.threadId,
            to: input.to,
            bcc: input.bcc,
            cc: input.cc,
            replyTo: input.replyTo,
            from: input.from,
            inReplyTo: input.inReplyTo,
            attachments: input.attachments,
        })
    }),
    forwardEmail: protectedProcedure.input(z.object({
        accountId: z.string(),
        threadId: z.string(),
        to: z.array(emailAddressSchema),
        cc: z.array(emailAddressSchema).optional(),
        bcc: z.array(emailAddressSchema).optional(),
        body: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId);
        const acc = new Account(account.token);

        // Find the last external email in the thread to forward
        const thread = await ctx.db.thread.findUnique({
            where: { id: input.threadId },
            include: {
                emails: {
                    orderBy: { sentAt: 'asc' }
                }
            }
        });

        if (!thread || thread.emails.length === 0) {
            throw new Error("Thread not found or empty");
        }

        // Forward the last email in the thread
        const lastEmail = thread.emails[thread.emails.length - 1];
        if (!lastEmail) throw new Error("No email found in thread");

        await acc.forwardEmail({
            messageId: lastEmail.internetMessageId,
            to: input.to,
            cc: input.cc,
            bcc: input.bcc,
            body: input.body
        });
    }),
    getEmailSuggestions: protectedProcedure.input(z.object({
        accountId: z.string(),
        query: z.string(),
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        return await ctx.db.emailAddress.findMany({
            where: {
                accountId: input.accountId,
                OR: [
                    {
                        address: {
                            contains: input.query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        name: {
                            contains: input.query,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            select: {
                address: true,
                name: true,
            },
            take: 10,
        })
    }),
    getMyAccount: protectedProcedure.input(z.object({
        accountId: z.string()
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        return account
    }),
    getChatbotInteraction: protectedProcedure.query(async ({ ctx }) => {
        const chatbotInteraction = await ctx.db.chatbotInteraction.findUnique({
            where: {
                day: new Date().toDateString(),
                userId: ctx.auth.userId
            }, select: { count: true }
        })
        const remainingCredits = FREE_CREDITS_PER_DAY - (chatbotInteraction?.count || 0)
        return {
            remainingCredits
        }
    }),
    getThreadsByIds: protectedProcedure.input(z.object({
        accountId: z.string(),
        threadIds: z.array(z.string()),
    })).query(async ({ ctx, input }) => {
        const account = await authoriseAccountAccess(input.accountId, ctx.auth.userId)
        return await ctx.db.thread.findMany({
            where: {
                id: { in: input.threadIds },
                accountId: account.id,
            },
            include: {
                emails: {
                    orderBy: { sentAt: 'asc' },
                    select: {
                        from: true,
                        body: true,
                        bodySnippet: true,
                        emailLabel: true,
                        subject: true,
                        sysLabels: true,
                        id: true,
                        sentAt: true,
                    },
                },
            },
            orderBy: { lastMessageDate: 'desc' },
        })
    }),
});