/**
 * Email Sync Deduplication
 * 
 * Prevents duplicate webhook processing when Aurinko sends the same 
 * notification multiple times (common with webhook retry logic).
 * 
 * Uses Redis SET NX (set-if-not-exists) to create an idempotency key.
 * Only the first caller to set the key "wins" and processes the sync.
 * The key auto-expires after TTL so future legitimate syncs still work.
 * 
 * Falls back to allowing all operations when Redis is unavailable.
 */

import { setNX } from './redis';

const DEDUP_TTL_SECONDS = 300; // 5 minutes — same event won't be processed twice within this window

/**
 * Check if this sync event should be processed (i.e., it hasn't been seen before).
 * 
 * @param accountId - The account being synced
 * @param eventId - Optional unique event identifier from the webhook payload
 * @returns true if this is the first time seeing this event (proceed with sync),
 *          false if it's a duplicate (skip processing)
 * 
 * @example
 * ```ts
 * if (await shouldProcessSync(accountId, webhookEventId)) {
 *     await account.syncEmails();
 * } else {
 *     console.log('Duplicate webhook — skipping');
 * }
 * ```
 */
export async function shouldProcessSync(
    accountId: string,
    eventId?: string
): Promise<boolean> {
    // Build a dedup key from account + event, or just account + timestamp window
    const key = eventId
        ? `sync:dedup:${accountId}:${eventId}`
        : `sync:dedup:${accountId}:${Math.floor(Date.now() / 10_000)}`; // 10-second window if no event ID

    return await setNX(key, DEDUP_TTL_SECONDS);
}
