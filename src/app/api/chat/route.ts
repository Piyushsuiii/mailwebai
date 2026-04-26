import { z } from "zod";

import { NextResponse } from "next/server";
import { OramaManager } from "@/lib/orama";
import { db } from "@/server/db";
import { validateRequest } from "@/lib/auth";
import { getSubscriptionStatus } from "@/lib/stripe-actions";
import { FREE_CREDITS_PER_DAY } from "@/app/constants";
import { rateLimitedStreamText, gemini as openai, RateLimitError } from "@/lib/gemini-client";
import { atomicIncrement, cacheGet } from "@/lib/redis";
import { acquireUserRateLimit, UserRateLimitError } from "@/lib/user-rate-limiter";

/**
 * Get seconds remaining until midnight UTC — used as TTL for daily counters.
 */
function secondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

export async function POST(req: Request) {
    console.log('[CHAT] POST /api/chat called');
    try {
        const { user } = await validateRequest();
        const userId = user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Per-user rate limit: 30 RPM — queues request until a slot opens
        await acquireUserRateLimit(userId);

        const isSubscribed = await getSubscriptionStatus();
        if (!isSubscribed) {
            // Try Redis first for daily limit check (atomic, fast, no DB hit)
            const today = new Date().toDateString();
            const redisKey = `chat:limit:${userId}:${today}`;
            const redisCount = await atomicIncrement(redisKey, secondsUntilMidnight());

            if (redisCount !== null) {
                // Redis available — use atomic counter
                if (redisCount > FREE_CREDITS_PER_DAY) {
                    return NextResponse.json({ error: "Limit reached" }, { status: 429 });
                }
                // Redis handled the count; skip DB for the check (we'll sync later)
            } else {
                // Redis unavailable — fall back to DB
                const chatbotInteraction = await db.chatbotInteraction.upsert({
                    where: { userId },
                    create: { userId, day: today, count: 0 },
                    update: {},
                });

                if (chatbotInteraction.day !== today) {
                    await db.chatbotInteraction.update({
                        where: { userId },
                        data: { day: today, count: 0 },
                    });
                } else if (chatbotInteraction.count >= FREE_CREDITS_PER_DAY) {
                    return NextResponse.json({ error: "Limit reached" }, { status: 429 });
                }
            }
        }

        const { messages, accountId, threadId } = await req.json();
        console.log('[CHAT] accountId:', accountId, 'messages:', messages.length, 'threadId:', threadId);

        // Safely extract last message content as a string
        const lastMessage = messages[messages.length - 1];
        const lastMessageContent = typeof lastMessage.content === 'string'
            ? lastMessage.content
            : Array.isArray(lastMessage.content)
                ? lastMessage.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ')
                : String(lastMessage.content || '');

        // RAG context from Orama (graceful fallback if it fails)
        let context = { hits: [] as any[] };
        try {
            const oramaManager = new OramaManager(accountId);
            await oramaManager.initialize();
            context = await oramaManager.vectorSearch({
                prompt: lastMessageContent,
            });
            console.log(context.hits.length + " hits found");
        } catch (e) {
            console.error('RAG context fetch failed, continuing without context:', e);
        }

        // Fetch the currently viewed thread for context awareness
        let currentEmailContext = '';
        if (threadId) {
            const currentThread = await db.thread.findUnique({
                where: { id: threadId },
                select: {
                    subject: true,
                    emails: {
                        orderBy: { sentAt: 'desc' },
                        take: 1,
                        select: {
                            from: { select: { name: true, address: true } },
                            to: { select: { name: true, address: true } },
                            subject: true,
                            bodySnippet: true,
                            sentAt: true,
                        },
                    },
                },
            });
            if (currentThread && currentThread.emails[0]) {
                const email = currentThread.emails[0];
                currentEmailContext = `\nCURRENTLY VIEWING EMAIL:\n- Subject: ${email.subject}\n- From: ${email.from?.name || ''} <${email.from?.address || ''}>\n- To: ${email.to?.map(t => `${t.name || ''} <${t.address}>`).join(', ')}\n- Date: ${email.sentAt?.toLocaleString()}\n- Snippet: ${email.bodySnippet?.slice(0, 300)}\n`;
            }
        }

        const systemPrompt = `You are an AI email assistant embedded in an email client app. You can both answer questions AND control the email UI.

THE TIME NOW IS ${new Date().toLocaleString()}

START CONTEXT BLOCK
${context.hits.map((hit: any) => JSON.stringify(hit.document)).join("\n")}
END OF CONTEXT BLOCK
${currentEmailContext}
CAPABILITIES:
- Answer questions about the user's emails using the context above.
- Compose & send emails by calling the compose_email tool.
- Navigate the UI (inbox, sent, drafts, done) by calling the navigate tool.
- Search emails by calling the search_emails tool (for simple text search).
- Smart search with filters by calling the smart_search tool (for date ranges, sender filtering, topic searches, label filtering like unread).
- Open a specific email by calling the open_email tool (to open/read/show one particular email).

INSTRUCTIONS:
- When the user asks you to send/compose/draft an email, use the compose_email tool. Fill in all fields from the user's message. Write the body as proper email HTML.
- When the user asks to go to inbox, sent, drafts, or done, use the navigate tool.
- When the user asks to open, read, or show a specific email (e.g. "open the latest email from David", "show me the email about invoices"), use the open_email tool. Extract the sender, subject, or keyword from the request. Do NOT set latest=true when you have sender/subject/keyword filters — filters already return the most recent match.
- When the user asks to open the latest/newest/most recent email WITHOUT specifying any sender, subject, or topic, use open_email with latest: true and no other filters.
- When the user says "reply to this" or "reply to this email", look at the CURRENTLY VIEWING EMAIL section above. Use compose_email with: to = the sender's email address, subject = "Re: " + original subject, body = an appropriate reply in HTML. If no email is being viewed, tell the user to open an email first.
- When the user asks to find/show/search for MULTIPLE emails with specific criteria (date ranges, from a specific person, about a topic), use the smart_search tool. Extract structured filters from their natural language query. For dates, calculate the ISO date strings relative to the current time.
- When the user asks to filter by labels like "unread", "starred", "important", or "draft", use the smart_search tool with the labels parameter.
- When the user asks to forward an email (e.g. "forward this to recipient@example.com"), use the forward_email tool. If they don't specify an email to forward, ask them to open one first or assume the currently viewed email.
- For simple keyword searches without specific filters, use the search_emails tool.
- After using a tool, also provide a brief conversational response confirming what you did. When smart_search returns results, summarize the findings briefly.
- If the context does not contain enough information, politely say so.
- Be helpful, clever, and concise.`;

        const result = await rateLimitedStreamText({
            model: openai("gemini-1.5-flash"),
            system: systemPrompt,
            messages: messages.filter((m: any) => m.role === "user" || m.role === "assistant"),
            tools: {
                compose_email: {
                    description:
                        "Open the compose email view and fill in the email fields. Use this when the user asks to send, compose, write, or draft an email.",
                    parameters: z.object({
                        to: z.array(z.string()).describe("Array of recipient email addresses"),
                        cc: z.array(z.string()).optional().describe("Array of CC email addresses"),
                        subject: z.string().describe("The email subject line"),
                        body: z.string().describe("The email body content as plain text or simple HTML"),
                        autoSend: z.boolean().optional().default(false).describe("If true, automatically send the email after composing"),
                    }),
                },
                navigate: {
                    description:
                        "Navigate to a specific tab in the email client. Use this when the user asks to see their inbox, sent emails, drafts, or done emails.",
                    parameters: z.object({
                        tab: z.enum(["inbox", "sent", "drafts", "done"]).describe("The tab to navigate to"),
                    }),
                },
                search_emails: {
                    description:
                        "Simple text search for emails. Use for quick keyword searches.",
                    parameters: z.object({
                        query: z.string().describe("The search query string"),
                    }),
                },
                smart_search: {
                    description:
                        "Search emails with structured filters. Use when the user asks to find emails by date range, from a specific person, about a specific topic, by labels (unread, starred, important), or any combination. This displays results in the main UI.",
                    parameters: z.object({
                        from: z.string().optional().describe("Sender name or email to filter by"),
                        to: z.string().optional().describe("Recipient name or email to filter by"),
                        subject: z.string().optional().describe("Keyword to search in email subject"),
                        keyword: z.string().optional().describe("Keyword to search in email body"),
                        dateFrom: z.string().optional().describe("Start date in ISO format, e.g. 2026-02-02"),
                        dateTo: z.string().optional().describe("End date in ISO format, e.g. 2026-02-12"),
                        labels: z.array(z.string()).optional().describe("Filter by email labels, e.g. ['unread'], ['starred'], ['important']"),
                    }),
                    execute: async ({ from, to, subject, keyword, dateFrom, dateTo, labels }) => {
                        // Query Prisma directly (we already authenticated the user above)
                        try {
                            const threadWhere: any = { accountId };

                            // Date range filter
                            if (dateFrom || dateTo) {
                                threadWhere.lastMessageDate = {};
                                if (dateFrom) threadWhere.lastMessageDate.gte = new Date(dateFrom);
                                if (dateTo) {
                                    const endDate = new Date(dateTo);
                                    endDate.setDate(endDate.getDate() + 1);
                                    threadWhere.lastMessageDate.lte = endDate;
                                }
                            }

                            // Sender filter
                            if (from) {
                                threadWhere.emails = {
                                    some: {
                                        from: {
                                            OR: [
                                                { name: { contains: from, mode: 'insensitive' } },
                                                { address: { contains: from, mode: 'insensitive' } },
                                            ],
                                        },
                                    },
                                };
                            }

                            // Recipient filter
                            if (to) {
                                threadWhere.emails = {
                                    ...(threadWhere.emails || {}),
                                    some: {
                                        ...(threadWhere.emails?.some || {}),
                                        to: {
                                            some: {
                                                OR: [
                                                    { name: { contains: to, mode: 'insensitive' } },
                                                    { address: { contains: to, mode: 'insensitive' } },
                                                ],
                                            },
                                        },
                                    },
                                };
                            }

                            // Subject filter
                            if (subject) {
                                threadWhere.subject = { contains: subject, mode: 'insensitive' };
                            }

                            // Body keyword filter
                            if (keyword) {
                                threadWhere.AND = [...(threadWhere.AND || []), {
                                    emails: {
                                        some: {
                                            OR: [
                                                { bodySnippet: { contains: keyword, mode: 'insensitive' } },
                                                { subject: { contains: keyword, mode: 'insensitive' } },
                                            ],
                                        },
                                    },
                                }];
                            }

                            // Labels filter (unread, starred, important, etc.)
                            if (labels && labels.length > 0) {
                                threadWhere.AND = [...(threadWhere.AND || []), {
                                    emails: {
                                        some: {
                                            sysLabels: { hasSome: labels },
                                        },
                                    },
                                }];
                            }

                            const threads = await db.thread.findMany({
                                where: threadWhere,
                                select: {
                                    id: true,
                                    subject: true,
                                    lastMessageDate: true,
                                    emails: {
                                        orderBy: { sentAt: 'desc' },
                                        take: 1,
                                        select: {
                                            from: { select: { name: true, address: true } },
                                            bodySnippet: true,
                                            sentAt: true,
                                            subject: true,
                                        },
                                    },
                                },
                                orderBy: { lastMessageDate: 'desc' },
                                take: 20,
                            });

                            const results = threads.map(t => ({
                                threadId: t.id,
                                subject: t.subject,
                                lastMessageDate: t.lastMessageDate?.toISOString(),
                                from: t.emails[0]?.from?.name || t.emails[0]?.from?.address || 'Unknown',
                                snippet: t.emails[0]?.bodySnippet?.slice(0, 100) || '',
                            }));

                            return {
                                success: true,
                                count: results.length,
                                threadIds: threads.map(t => t.id),
                                results,
                            };
                        } catch (error) {
                            console.error('Smart search error:', error);
                            return { success: false, count: 0, threadIds: [], results: [] };
                        }
                    },
                },
                open_email: {
                    description:
                        "Open and display a specific email in the detail view. Use when the user asks to open, read, or show a particular email. Supports filtering by sender, subject, keyword. Results are always sorted by newest first. Only use latest=true when no other filters are provided.",
                    parameters: z.object({
                        latest: z.boolean().optional().describe("If true AND no from/subject/keyword filters are set, open the most recent email overall. Do NOT set this to true when you have other filters."),
                        from: z.string().optional().describe("Sender name or email to find"),
                        subject: z.string().optional().describe("Subject keyword to match"),
                        keyword: z.string().optional().describe("Body keyword to match"),
                    }),
                    execute: async ({ latest, from, subject, keyword }) => {
                        try {
                            console.log('[OPEN_EMAIL] execute called:', { latest, from, subject, keyword, accountId });
                            const threadWhere: any = { accountId };

                            // Step 1: If `from` is specified, find matching EmailAddress records first
                            if (from) {
                                const matchingAddresses = await db.emailAddress.findMany({
                                    where: {
                                        OR: [
                                            { name: { contains: from, mode: 'insensitive' } },
                                            { address: { contains: from, mode: 'insensitive' } },
                                        ],
                                    },
                                    select: { id: true, name: true, address: true, accountId: true },
                                });
                                console.log('[OPEN_EMAIL] Matching addresses for "' + from + '":', matchingAddresses.length, matchingAddresses.map(a => `${a.name} <${a.address}> [Acc:${a.accountId}]`));

                                if (matchingAddresses.length > 0) {
                                    threadWhere.emails = {
                                        some: {
                                            fromId: { in: matchingAddresses.map(a => a.id) },
                                        },
                                    };
                                } else {
                                    // Fallback: search in thread subject or email body for the term
                                    console.log('[OPEN_EMAIL] No matching addresses, falling back to subject/body search for:', from);

                                    threadWhere.OR = [
                                        { subject: { contains: from, mode: 'insensitive' } },
                                        {
                                            emails: {
                                                some: {
                                                    OR: [
                                                        { bodySnippet: { contains: from, mode: 'insensitive' } },
                                                        { subject: { contains: from, mode: 'insensitive' } },
                                                    ],
                                                },
                                            },
                                        },
                                    ];
                                }
                            }

                            if (subject) {
                                threadWhere.subject = { contains: subject, mode: 'insensitive' };
                            }

                            if (keyword) {
                                const keywordClause = {
                                    emails: {
                                        some: {
                                            OR: [
                                                { bodySnippet: { contains: keyword, mode: 'insensitive' } },
                                                { subject: { contains: keyword, mode: 'insensitive' } },
                                            ],
                                        },
                                    },
                                };
                                if (threadWhere.AND) {
                                    threadWhere.AND.push(keywordClause);
                                } else {
                                    threadWhere.AND = [keywordClause];
                                }
                            }

                            console.log('[OPEN_EMAIL] Final query where:', JSON.stringify(threadWhere, null, 2));

                            const thread = await db.thread.findFirst({
                                where: threadWhere,
                                select: {
                                    id: true,
                                    subject: true,
                                    emails: {
                                        orderBy: { sentAt: 'desc' },
                                        take: 1,
                                        select: {
                                            from: { select: { name: true, address: true } },
                                            bodySnippet: true,
                                            subject: true,
                                        },
                                    },
                                },
                                orderBy: { lastMessageDate: 'desc' },
                            });

                            if (!thread) {
                                console.log('[OPEN_EMAIL] No thread found');
                                return { success: false, threadId: null, message: 'No matching email found' };
                            }

                            console.log('[OPEN_EMAIL] Found thread:', thread.id, 'subject:', thread.subject, 'from:', thread.emails[0]?.from?.name);

                            return {
                                success: true,
                                threadId: thread.id,
                                subject: thread.subject,
                                from: thread.emails[0]?.from?.name || thread.emails[0]?.from?.address || 'Unknown',
                                snippet: thread.emails[0]?.bodySnippet?.slice(0, 150) || '',
                            };
                        } catch (error) {
                            console.error('[OPEN_EMAIL] Error:', error);
                            return { success: false, threadId: null, message: 'Failed to find email' };
                        }
                    },
                },
                forward_email: {
                    description:
                        "Forward an email to a recipient. Use this when the user asks to forward the current email or a specific email.",
                    parameters: z.object({
                        threadId: z.string().optional().describe("The thread ID of the email to forward. If not provided, the AI will attempt to use the currently viewed thread."),
                        to: z.array(z.string()).describe("Array of recipient email addresses"),
                        cc: z.array(z.string()).optional().describe("Array of CC email addresses"),
                        bcc: z.array(z.string()).optional().describe("Array of BCC email addresses"),
                        body: z.string().optional().describe("Optional text to include above the forwarded message (e.g. user comments)"),
                    }),
                    execute: async ({ threadId: toolThreadId, to, cc, bcc, body }: { threadId?: string, to: string[], cc?: string[], bcc?: string[], body?: string }) => {
                        const targetThreadId = toolThreadId || threadId;
                        if (!targetThreadId) {
                            return { success: false, message: "No email selected to forward. Please open an email first." };
                        }

                        try {
                            const account = await db.account.findFirst({
                                where: { id: accountId, userId },
                                select: { token: true, id: true, emailAddress: true, name: true }
                            });

                            if (!account) return { success: false, message: "Account not found" };

                            const { default: Account } = await import('@/lib/account');
                            const acc = new Account(account.token);

                            const thread = await db.thread.findUnique({
                                where: { id: targetThreadId },
                                include: {
                                    emails: {
                                        orderBy: { sentAt: 'asc' }
                                    }
                                }
                            });

                            if (!thread || thread.emails.length === 0) {
                                return { success: false, message: "Thread not found or empty" };
                            }

                            const lastEmail = thread.emails[thread.emails.length - 1];
                            if (!lastEmail) return { success: false, message: "No email found in thread" };

                            await acc.forwardEmail({
                                messageId: lastEmail.internetMessageId,
                                to: to.map((email: string) => ({ name: email, address: email })),
                                cc: cc?.map((email: string) => ({ name: email, address: email })),
                                bcc: bcc?.map((email: string) => ({ name: email, address: email })),
                                body
                            });

                            return { success: true, message: `Email forwarded to ${to.join(', ')}` };
                        } catch (error) {
                            console.error('Forward email error:', error);
                            return { success: false, message: "Failed to forward email. Please try again." };
                        }
                    },
                },
            },
            maxSteps: 5,
            onFinish: async () => {
                try {
                    // Sync count to DB for persistence (Redis is source of truth for live counting,
                    // but DB keeps the long-term record). This runs asynchronously after the response.
                    const today = new Date().toDateString();
                    const redisKey = `chat:limit:${userId}:${today}`;
                    const { cacheGet } = await import('@/lib/redis');
                    const currentCount = await cacheGet<number>(redisKey);

                    await db.chatbotInteraction.upsert({
                        where: { userId },
                        update: { count: currentCount ?? 1, day: today },
                        create: { userId, day: today, count: currentCount ?? 1 },
                    });
                } catch (e) {
                    console.error('Failed to sync chatbot interaction count to DB:', e);
                }
            },
        });

        return result.toDataStreamResponse();
    } catch (error) {
        if (error instanceof UserRateLimitError) {
            console.warn('[CHAT] User rate limit queue timeout:', error.message);
            return NextResponse.json(
                { error: 'Too many requests. Please try again shortly.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)) } }
            );
        }
        if (error instanceof RateLimitError) {
            console.warn('[CHAT] Rate limited:', error.message);
            return NextResponse.json(
                { error: 'Too many requests. Please try again shortly.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)) } }
            );
        }
        console.error('[CHAT] Fatal error:', error);
        return NextResponse.json({ error: "error" }, { status: 500 });
    }
}
