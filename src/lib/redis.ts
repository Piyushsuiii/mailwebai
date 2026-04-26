/**
 * Redis Client Singleton (Upstash REST-based)
 * 
 * Provides a shared Redis instance for:
 *  - Distributed rate limiting (across multiple Cloud Run instances)
 *  - Subscription status caching (avoid repeated DB queries)
 *  - Chatbot daily limit counters (atomic INCR)
 *  - Email sync deduplication (SET NX idempotency keys)
 * 
 * Falls back gracefully when env vars are missing — the app
 * continues to work with in-memory alternatives.
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/**
 * Get the singleton Redis client.
 * Returns `null` if Upstash credentials are not configured,
 * allowing callers to fall back to in-memory behavior.
 */
export function getRedis(): Redis | null {
    if (redis) return redis;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn('[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — using in-memory fallback');
        return null;
    }

    try {
        redis = new Redis({ url, token });
        console.log('[Redis] Connected to Upstash Redis');
        return redis;
    } catch (error) {
        console.error('[Redis] Failed to initialize:', error);
        return null;
    }
}

// ─── Cache Helpers ───────────────────────────────────────────────

/**
 * Get a cached value. Returns null on miss or if Redis is unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    const client = getRedis();
    if (!client) return null;

    try {
        const value = await client.get<T>(key);
        return value;
    } catch (error) {
        console.error(`[Redis] cacheGet error for key "${key}":`, error);
        return null;
    }
}

/**
 * Set a cached value with TTL (in seconds).
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        await client.set(key, value, { ex: ttlSeconds });
    } catch (error) {
        console.error(`[Redis] cacheSet error for key "${key}":`, error);
    }
}

/**
 * Delete a cached value (for cache invalidation).
 */
export async function cacheDel(key: string): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        await client.del(key);
    } catch (error) {
        console.error(`[Redis] cacheDel error for key "${key}":`, error);
    }
}

/**
 * Delete all keys matching a prefix (e.g. "threads:abc123:").
 * Uses SCAN to find keys, then DEL to remove them in batch.
 * Safe for production — SCAN is non-blocking unlike KEYS.
 */
export async function cacheDelPattern(prefix: string): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        let cursor = 0;
        const keysToDelete: string[] = [];

        do {
            const result = await client.scan(cursor, { match: `${prefix}*`, count: 100 });
            cursor = Number(result[0]);
            keysToDelete.push(...(result[1] as string[]));
        } while (cursor !== 0);

        if (keysToDelete.length > 0) {
            await Promise.all(keysToDelete.map(key => client.del(key)));
            console.log(`[Redis] cacheDelPattern deleted ${keysToDelete.length} keys matching "${prefix}*"`);
        }
    } catch (error) {
        console.error(`[Redis] cacheDelPattern error for prefix "${prefix}":`, error);
    }
}

/**
 * Atomic increment with auto-expiry. Perfect for daily counters.
 * Returns the new count after incrementing.
 * Returns null if Redis is unavailable.
 */
export async function atomicIncrement(key: string, ttlSeconds?: number): Promise<number | null> {
    const client = getRedis();
    if (!client) return null;

    try {
        const count = await client.incr(key);
        // Set TTL only on first increment (when count === 1)
        if (ttlSeconds && count === 1) {
            await client.expire(key, ttlSeconds);
        }
        return count;
    } catch (error) {
        console.error(`[Redis] atomicIncrement error for key "${key}":`, error);
        return null;
    }
}

/**
 * Set-if-not-exists with TTL. Returns true if the key was set (first caller wins).
 * Perfect for deduplication / idempotency keys.
 */
export async function setNX(key: string, ttlSeconds: number): Promise<boolean> {
    const client = getRedis();
    if (!client) return true; // If no Redis, allow the operation

    try {
        const result = await client.set(key, '1', { nx: true, ex: ttlSeconds });
        return result === 'OK';
    } catch (error) {
        console.error(`[Redis] setNX error for key "${key}":`, error);
        return true; // On error, allow the operation
    }
}
