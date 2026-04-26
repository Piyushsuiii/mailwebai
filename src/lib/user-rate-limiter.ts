/**
 * Per-User Rate Limiter — 30 RPM (requests per minute)
 * 
 * Queue-based: when a user exceeds 30 RPM, their request is held
 * in a wait loop until a slot opens in the sliding window. Only
 * rejects if the wait exceeds a timeout (15 seconds).
 * 
 * Uses Redis (Upstash) sorted sets as a sliding window counter,
 * keyed per userId. Falls back to in-memory when Redis is unavailable.
 * 
 * Usage:
 *   await acquireUserRateLimit(userId); // waits for slot or throws after timeout
 */

import { getRedis } from './redis';

// ─── Configuration ───────────────────────────────────────────────

const USER_RPM_LIMIT = 30;         // max requests per user per minute
const WINDOW_MS = 60_000;          // 1-minute sliding window
const QUEUE_TIMEOUT_MS = 15_000;   // max time to wait for a slot
const POLL_INTERVAL_MS = 500;      // how often to re-check for a slot
const REDIS_KEY_PREFIX = 'user:rpm:';
const REDIS_TTL_SECONDS = 120;     // auto-expire keys (safety net)

// ─── Error Class ─────────────────────────────────────────────────

export class UserRateLimitError extends Error {
    public retryAfterMs: number;

    constructor(message: string, retryAfterMs: number) {
        super(message);
        this.name = 'UserRateLimitError';
        this.retryAfterMs = retryAfterMs;
    }
}

// ─── In-Memory Fallback ──────────────────────────────────────────

const inMemoryWindows = new Map<string, number[]>();

function pruneInMemory(userId: string): number[] {
    const cutoff = Date.now() - WINDOW_MS;
    const timestamps = (inMemoryWindows.get(userId) || []).filter(t => t > cutoff);
    inMemoryWindows.set(userId, timestamps);
    return timestamps;
}

// ─── Main Entry Point ────────────────────────────────────────────

/**
 * Acquire a rate-limit slot for the given user.
 * 
 * - If under 30 RPM → resolves immediately.
 * - If over 30 RPM → waits (polls) until a slot opens.
 * - If wait exceeds 15 seconds → throws UserRateLimitError.
 */
export async function acquireUserRateLimit(userId: string): Promise<void> {
    const startedAt = Date.now();

    while (true) {
        const result = await tryAcquire(userId);
        if (result.acquired) {
            if (Date.now() - startedAt > 100) {
                console.log(`[UserRateLimit] User ${userId} waited ${Date.now() - startedAt}ms for slot`);
            }
            return;
        }

        // Check timeout
        const elapsed = Date.now() - startedAt;
        if (elapsed >= QUEUE_TIMEOUT_MS) {
            throw new UserRateLimitError(
                `Per-user rate limit exceeded (${USER_RPM_LIMIT} RPM). Queued for ${elapsed}ms but no slot opened.`,
                result.retryAfterMs,
            );
        }

        // Wait before retrying — use the smaller of retry-after or poll interval
        const waitMs = Math.min(result.retryAfterMs, POLL_INTERVAL_MS, QUEUE_TIMEOUT_MS - elapsed);
        await sleep(Math.max(waitMs, 200));
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Try to Acquire a Slot ───────────────────────────────────────

interface AcquireResult {
    acquired: boolean;
    retryAfterMs: number;
}

async function tryAcquire(userId: string): Promise<AcquireResult> {
    const redis = getRedis();
    if (redis) {
        return tryAcquireRedis(redis, userId);
    }
    return tryAcquireInMemory(userId);
}

// ─── Redis Implementation ────────────────────────────────────────

async function tryAcquireRedis(
    redis: NonNullable<ReturnType<typeof getRedis>>,
    userId: string,
): Promise<AcquireResult> {
    const key = `${REDIS_KEY_PREFIX}${userId}`;
    const now = Date.now();
    const cutoff = now - WINDOW_MS;
    const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;

    try {
        // Step 1: Prune + count (without adding yet)
        const pipeline = redis.pipeline();
        pipeline.zremrangebyscore(key, 0, cutoff);
        pipeline.zcard(key);
        const results = await pipeline.exec();

        const currentCount = (results[1] as number) || 0;

        if (currentCount >= USER_RPM_LIMIT) {
            // Over limit — calculate when the oldest entry expires
            const retryAfterMs = await getRetryAfter(redis, key);
            return { acquired: false, retryAfterMs };
        }

        // Step 2: Under limit — add entry + set TTL
        await redis.pipeline()
            .zadd(key, { score: now, member })
            .expire(key, REDIS_TTL_SECONDS)
            .exec();

        return { acquired: true, retryAfterMs: 0 };
    } catch (error) {
        console.error('[UserRateLimit:Redis] Error, falling back to in-memory:', error);
        return tryAcquireInMemory(userId);
    }
}

async function getRetryAfter(
    redis: NonNullable<ReturnType<typeof getRedis>>,
    key: string,
): Promise<number> {
    try {
        const oldest = await redis.zrange(key, 0, 0, { withScores: true }) as any[];
        if (oldest && oldest.length >= 2) {
            const oldestScore = typeof oldest[1] === 'number' ? oldest[1] : Number(oldest[1]);
            return Math.max(200, (oldestScore + WINDOW_MS) - Date.now());
        }
    } catch { /* ignore */ }
    return POLL_INTERVAL_MS;
}

// ─── In-Memory Implementation ────────────────────────────────────

function tryAcquireInMemory(userId: string): AcquireResult {
    const timestamps = pruneInMemory(userId);

    if (timestamps.length >= USER_RPM_LIMIT) {
        const oldest = timestamps[0]!;
        const retryAfterMs = Math.max(200, (oldest + WINDOW_MS) - Date.now());
        return { acquired: false, retryAfterMs };
    }

    // Record this request
    timestamps.push(Date.now());
    inMemoryWindows.set(userId, timestamps);
    return { acquired: true, retryAfterMs: 0 };
}
