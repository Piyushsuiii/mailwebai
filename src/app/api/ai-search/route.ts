import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { validateRequest } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { acquireUserRateLimit, UserRateLimitError } from "@/lib/user-rate-limiter";

// AI Search endpoint — performs structured Prisma queries with date/sender/keyword filters
export async function POST(req: Request) {
    try {
        const { user } = await validateRequest();
        const userId = user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Per-user rate limit: 30 RPM — queues request until a slot opens
        await acquireUserRateLimit(userId);

        const { accountId, from, to, subject, keyword, dateFrom, dateTo } = await req.json();

        // Verify account ownership
        const account = await db.account.findFirst({
            where: { id: accountId, userId },
            select: { id: true },
        });
        if (!account) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        // Build dynamic Prisma where clause
        const threadWhere: Prisma.ThreadWhereInput = {
            accountId: account.id,
        };

        // Date range filter on lastMessageDate
        if (dateFrom || dateTo) {
            threadWhere.lastMessageDate = {};
            if (dateFrom) {
                (threadWhere.lastMessageDate as any).gte = new Date(dateFrom);
            }
            if (dateTo) {
                // Add 1 day to dateTo to include the full end date
                const endDate = new Date(dateTo);
                endDate.setDate(endDate.getDate() + 1);
                (threadWhere.lastMessageDate as any).lte = endDate;
            }
        }

        // Sender filter
        if (from) {
            threadWhere.emails = {
                some: {
                    from: {
                        OR: [
                            { name: { contains: from, mode: "insensitive" } },
                            { address: { contains: from, mode: "insensitive" } },
                        ],
                    },
                },
            };
        }

        // Recipient filter
        if (to) {
            threadWhere.emails = {
                ...threadWhere.emails as any,
                some: {
                    ...(threadWhere.emails as any)?.some,
                    to: {
                        some: {
                            OR: [
                                { name: { contains: to, mode: "insensitive" } },
                                { address: { contains: to, mode: "insensitive" } },
                            ],
                        },
                    },
                },
            };
        }

        // Subject filter
        if (subject) {
            threadWhere.subject = { contains: subject, mode: "insensitive" };
        }

        // Body keyword filter
        if (keyword) {
            const keywordFilter: Prisma.ThreadWhereInput = {
                emails: {
                    some: {
                        OR: [
                            { bodySnippet: { contains: keyword, mode: "insensitive" } },
                            { subject: { contains: keyword, mode: "insensitive" } },
                        ],
                    },
                },
            };
            threadWhere.AND = [keywordFilter];
        }

        const threads = await db.thread.findMany({
            where: threadWhere,
            select: {
                id: true,
                subject: true,
                lastMessageDate: true,
                emails: {
                    orderBy: { sentAt: "desc" },
                    take: 1,
                    select: {
                        from: { select: { name: true, address: true } },
                        bodySnippet: true,
                        sentAt: true,
                        subject: true,
                    },
                },
            },
            orderBy: { lastMessageDate: "desc" },
            take: 20,
        });

        // Format results for the AI to summarize
        const results = threads.map((t) => ({
            threadId: t.id,
            subject: t.subject,
            lastMessageDate: t.lastMessageDate.toISOString(),
            from: t.emails[0]?.from?.name || t.emails[0]?.from?.address || "Unknown",
            snippet: t.emails[0]?.bodySnippet?.slice(0, 100) || "",
        }));

        return NextResponse.json({
            count: results.length,
            threadIds: threads.map((t) => t.id),
            results,
        });
    } catch (error) {
        if (error instanceof UserRateLimitError) {
            return NextResponse.json(
                { error: "Too many requests. Please try again shortly." },
                { status: 429, headers: { 'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)) } }
            );
        }
        console.error("AI search error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
