import Account from "@/lib/account";
import { syncEmailsToDatabase } from "@/lib/sync-to-db";
import { db } from "@/server/db";
import { validateRequest } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

export const maxDuration = 300

export const POST = async (req: NextRequest) => {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json()
    const { accountId } = body
    const userId = user.id;

    if (!accountId || !userId) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const dbAccount = await db.account.findUnique({
        where: {
            id: accountId,
            userId,
        }
    })
    if (!dbAccount) return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });

    const account = new Account(dbAccount.token)
    await account.createSubscription()
    const response = await account.performInitialSync(20) // Limit to 20 emails
    if (!response) return NextResponse.json({ error: "FAILED_TO_SYNC" }, { status: 500 });

    const { deltaToken, emails, nextPageToken } = response

    await syncEmailsToDatabase(emails, accountId)

    await db.account.update({
        where: {
            token: dbAccount.token,
        },
        data: {
            nextDeltaToken: deltaToken,
        },
    });

    // Trigger background sync if there are more pages
    if (nextPageToken) {
        (async () => {
            await account.syncRemainingEmails(nextPageToken, deltaToken)
        })()
    }

    console.log('Initial sync complete', deltaToken)
    return NextResponse.json({ success: true, deltaToken }, { status: 200 });

}