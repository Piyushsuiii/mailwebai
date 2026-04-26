/**
 * Email Cache Layer — Redis-backed caching for email thread data
 *
 * Caches "default" views only (no filters). Filtered queries bypass
 * cache and hit DB directly, keeping the key space small.
 *
 * TTLs:
 *  - Thread lists:  30s (absorbs 5s refetch interval → 6 DB queries → 1)
 *  - Single thread: 60s (viewed less frequently)
 *  - Thread counts: 30s (same rhythm as thread lists)
 *  - Accounts:     300s (rarely changes)
 *
 * All functions gracefully return null / void when Redis is unavailable.
 */

import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from './redis';

// ─── TTLs (seconds) ──────────────────────────────────────────────
const TTL_THREAD_LIST = 30;
const TTL_SINGLE_THREAD = 60;
const TTL_THREAD_COUNT = 30;
const TTL_ACCOUNTS = 300;

// ─── Key Builders ────────────────────────────────────────────────
function threadListKey(accountId: string, tab: string, done: boolean): string {
    return `threads:${accountId}:${tab}:${done}`;
}

function singleThreadKey(accountId: string, threadId: string): string {
    return `thread:${accountId}:${threadId}`;
}

function threadCountKey(accountId: string, tab: string): string {
    return `threadcount:${accountId}:${tab}`;
}

function accountsKey(userId: string): string {
    return `accounts:${userId}`;
}

// ─── Thread List Cache ───────────────────────────────────────────

export async function getCachedThreads<T>(accountId: string, tab: string, done: boolean): Promise<T | null> {
    const key = threadListKey(accountId, tab, done);
    const cached = await cacheGet<T>(key);
    if (cached) {
        console.log(`[EmailCache] HIT thread list — ${key}`);
    }
    return cached;
}

export async function setCachedThreads(accountId: string, tab: string, done: boolean, threads: unknown): Promise<void> {
    const key = threadListKey(accountId, tab, done);
    await cacheSet(key, threads, TTL_THREAD_LIST);
    console.log(`[EmailCache] SET thread list — ${key} (TTL ${TTL_THREAD_LIST}s)`);
}

// ─── Single Thread Cache ─────────────────────────────────────────

export async function getCachedThread<T>(accountId: string, threadId: string): Promise<T | null> {
    const key = singleThreadKey(accountId, threadId);
    const cached = await cacheGet<T>(key);
    if (cached) {
        console.log(`[EmailCache] HIT single thread — ${key}`);
    }
    return cached;
}

export async function setCachedThread(accountId: string, threadId: string, thread: unknown): Promise<void> {
    const key = singleThreadKey(accountId, threadId);
    await cacheSet(key, thread, TTL_SINGLE_THREAD);
    console.log(`[EmailCache] SET single thread — ${key} (TTL ${TTL_SINGLE_THREAD}s)`);
}

// ─── Thread Count Cache ──────────────────────────────────────────

export async function getCachedThreadCount(accountId: string, tab: string): Promise<number | null> {
    const key = threadCountKey(accountId, tab);
    const cached = await cacheGet<number>(key);
    if (cached !== null) {
        console.log(`[EmailCache] HIT thread count — ${key}`);
    }
    return cached;
}

export async function setCachedThreadCount(accountId: string, tab: string, count: number): Promise<void> {
    const key = threadCountKey(accountId, tab);
    await cacheSet(key, count, TTL_THREAD_COUNT);
    console.log(`[EmailCache] SET thread count — ${key} (TTL ${TTL_THREAD_COUNT}s)`);
}

// ─── Accounts Cache ──────────────────────────────────────────────

export async function getCachedAccounts<T>(userId: string): Promise<T | null> {
    const key = accountsKey(userId);
    const cached = await cacheGet<T>(key);
    if (cached) {
        console.log(`[EmailCache] HIT accounts — ${key}`);
    }
    return cached;
}

export async function setCachedAccounts(userId: string, accounts: unknown): Promise<void> {
    const key = accountsKey(userId);
    await cacheSet(key, accounts, TTL_ACCOUNTS);
    console.log(`[EmailCache] SET accounts — ${key} (TTL ${TTL_ACCOUNTS}s)`);
}

// ─── Cache Invalidation ─────────────────────────────────────────

/**
 * Invalidate ALL thread-related caches for an account.
 * Called after: syncEmails, setDone, setUndone, markThreadAsRead.
 */
export async function invalidateThreadCaches(accountId: string): Promise<void> {
    console.log(`[EmailCache] INVALIDATE all caches for account ${accountId}`);
    await Promise.all([
        cacheDelPattern(`threads:${accountId}:`),
        cacheDelPattern(`thread:${accountId}:`),
        cacheDelPattern(`threadcount:${accountId}:`),
    ]);
}

/**
 * Invalidate a single cached thread + all thread lists (since list data changed).
 * Called after: markThreadAsRead (the thread data changed, and list reflects read status).
 */
export async function invalidateSingleThread(accountId: string, threadId: string): Promise<void> {
    const key = singleThreadKey(accountId, threadId);
    console.log(`[EmailCache] INVALIDATE single thread — ${key}`);
    await cacheDel(key);
}
