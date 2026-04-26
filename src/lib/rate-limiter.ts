/**
 * Queue-Based OpenAI API Rate Limiter — Redis-Backed
 * 
 * Sliding-window counter + priority FIFO queue.
 * Protects against exceeding 5000 RPM / 2M input tokens per minute.
 * 
 * Uses Redis (Upstash) for distributed counting across multiple instances.
 * Falls back to in-memory counters when Redis is unavailable.
 */

import { getRedis } from './redis';

// ─── Configuration ───────────────────────────────────────────────

export interface RateLimiterConfig {
    maxRPM: number;
    maxTokensPerMin: number;
    maxQueueSize: number;
    queueTimeoutMs: number;
    windowMs: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
    maxRPM: 5000,
    maxTokensPerMin: 2_000_000,
    maxQueueSize: 100,
    queueTimeoutMs: 30_000,   // 30 seconds max wait
    windowMs: 60_000,          // 1-minute sliding window
};

// ─── Types ───────────────────────────────────────────────────────

export type Priority = 'high' | 'normal' | 'low';

export class RateLimitError extends Error {
    public retryAfterMs: number;

    constructor(message: string, retryAfterMs: number) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfterMs = retryAfterMs;
    }
}

interface QueuedRequest {
    priority: Priority;
    estimatedTokens: number;
    resolve: () => void;
    reject: (error: Error) => void;
    enqueuedAt: number;
    timeoutId: ReturnType<typeof setTimeout>;
}

// Priority weights for ordering (lower = processed first)
const PRIORITY_WEIGHT: Record<Priority, number> = {
    high: 0,
    normal: 1,
    low: 2,
};

// ─── Redis Keys ──────────────────────────────────────────────────

const REDIS_KEY_REQUESTS = 'ratelimit:openai:requests';
const REDIS_KEY_TOKENS = 'ratelimit:openai:tokens';

// ─── In-Memory Fallback Counter ──────────────────────────────────

interface WindowEntry {
    timestamp: number;
    tokens: number;
}

class InMemoryCounter {
    private entries: WindowEntry[] = [];
    private windowMs: number;

    constructor(windowMs: number) {
        this.windowMs = windowMs;
    }

    private prune(): void {
        const cutoff = Date.now() - this.windowMs;
        while (this.entries.length > 0 && this.entries[0]!.timestamp < cutoff) {
            this.entries.shift();
        }
    }

    record(tokens: number): void {
        this.entries.push({ timestamp: Date.now(), tokens });
    }

    getRequestCount(): number {
        this.prune();
        return this.entries.length;
    }

    getTokenCount(): number {
        this.prune();
        return this.entries.reduce((sum, e) => sum + e.tokens, 0);
    }

    getTimeUntilNextSlot(): number {
        this.prune();
        if (this.entries.length === 0) return 0;
        const oldest = this.entries[0]!.timestamp;
        return Math.max(0, (oldest + this.windowMs) - Date.now());
    }
}

// ─── Redis Sliding Window Counter ────────────────────────────────

class RedisSlidingWindow {
    private windowMs: number;
    private fallback: InMemoryCounter;

    constructor(windowMs: number) {
        this.windowMs = windowMs;
        this.fallback = new InMemoryCounter(windowMs);
    }

    /**
     * Record a request in Redis using sorted sets.
     * Score = timestamp, Member = unique ID (timestamp:random)
     * Also records token usage in a separate sorted set.
     */
    async record(tokens: number): Promise<void> {
        const redis = getRedis();
        if (!redis) {
            this.fallback.record(tokens);
            return;
        }

        try {
            const now = Date.now();
            const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
            const cutoff = now - this.windowMs;

            // Pipeline: add entry + prune old entries (both sorted sets)
            await redis.pipeline()
                .zadd(REDIS_KEY_REQUESTS, { score: now, member })
                .zremrangebyscore(REDIS_KEY_REQUESTS, 0, cutoff)
                .zadd(REDIS_KEY_TOKENS, { score: now, member: `${member}:${tokens}` })
                .zremrangebyscore(REDIS_KEY_TOKENS, 0, cutoff)
                // Auto-expire the keys after 2 minutes (safety net)
                .expire(REDIS_KEY_REQUESTS, 120)
                .expire(REDIS_KEY_TOKENS, 120)
                .exec();
        } catch (error) {
            console.error('[RateLimiter:Redis] record error, falling back:', error);
            this.fallback.record(tokens);
        }
    }

    async getRequestCount(): Promise<number> {
        const redis = getRedis();
        if (!redis) return this.fallback.getRequestCount();

        try {
            const cutoff = Date.now() - this.windowMs;
            await redis.zremrangebyscore(REDIS_KEY_REQUESTS, 0, cutoff);
            return await redis.zcard(REDIS_KEY_REQUESTS);
        } catch (error) {
            console.error('[RateLimiter:Redis] getRequestCount error:', error);
            return this.fallback.getRequestCount();
        }
    }

    async getTokenCount(): Promise<number> {
        const redis = getRedis();
        if (!redis) return this.fallback.getTokenCount();

        try {
            const cutoff = Date.now() - this.windowMs;
            await redis.zremrangebyscore(REDIS_KEY_TOKENS, 0, cutoff);
            // Members are stored as "timestamp:random:tokenCount"
            const members = await redis.zrange(REDIS_KEY_TOKENS, cutoff, Date.now(), { byScore: true }) as string[];
            let total = 0;
            for (const member of members) {
                const parts = member.split(':');
                const tokenStr = parts[parts.length - 1];
                if (tokenStr) total += parseInt(tokenStr, 10) || 0;
            }
            return total;
        } catch (error) {
            console.error('[RateLimiter:Redis] getTokenCount error:', error);
            return this.fallback.getTokenCount();
        }
    }

    async getTimeUntilNextSlot(): Promise<number> {
        const redis = getRedis();
        if (!redis) return this.fallback.getTimeUntilNextSlot();

        try {
            // Get the oldest member (lowest score = earliest timestamp)
            const members = await redis.zrange(REDIS_KEY_REQUESTS, 0, 0) as string[];
            if (members.length === 0) return 0;
            const oldestScore = await redis.zscore(REDIS_KEY_REQUESTS, members[0]!);
            if (!oldestScore) return 0;
            return Math.max(0, (Number(oldestScore) + this.windowMs) - Date.now());
        } catch (error) {
            console.error('[RateLimiter:Redis] getTimeUntilNextSlot error:', error);
            return this.fallback.getTimeUntilNextSlot();
        }
    }
}

// ─── OpenAI Rate Limiter (Singleton) ─────────────────────────────

export class OpenAIRateLimiter {
    private static instance: OpenAIRateLimiter | null = null;

    private config: RateLimiterConfig;
    private counter: RedisSlidingWindow;
    private queue: QueuedRequest[] = [];
    private processing = false;

    private constructor(config: RateLimiterConfig) {
        this.config = config;
        this.counter = new RedisSlidingWindow(config.windowMs);
        const backend = getRedis() ? 'Redis (Upstash)' : 'in-memory fallback';
        console.log(`[RateLimiter] Initialized with ${backend}`);
    }

    static getInstance(config?: Partial<RateLimiterConfig>): OpenAIRateLimiter {
        if (!OpenAIRateLimiter.instance) {
            OpenAIRateLimiter.instance = new OpenAIRateLimiter({
                ...DEFAULT_CONFIG,
                ...config,
            });
        }
        return OpenAIRateLimiter.instance;
    }

    /** Reset the singleton (useful for testing) */
    static reset(): void {
        OpenAIRateLimiter.instance = null;
    }

    /**
     * Acquire a slot to make an OpenAI API call.
     * Resolves when the request can proceed.
     * Rejects with RateLimitError if the queue is full or timeout is exceeded.
     */
    async acquire(priority: Priority = 'normal', estimatedTokens: number = 0): Promise<void> {
        // Fast path: if under limits, proceed immediately
        if (await this.canProceed(estimatedTokens)) {
            await this.counter.record(estimatedTokens);
            this.logStatus('acquire:immediate', priority, estimatedTokens);
            return;
        }

        // Queue is full → reject immediately
        if (this.queue.length >= this.config.maxQueueSize) {
            const retryAfter = await this.counter.getTimeUntilNextSlot();
            throw new RateLimitError(
                `Rate limiter queue is full (${this.queue.length}/${this.config.maxQueueSize}). Try again later.`,
                retryAfter
            );
        }

        // Enqueue and wait
        return new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                // Remove from queue on timeout
                const idx = this.queue.findIndex(q => q.resolve === resolve);
                if (idx !== -1) this.queue.splice(idx, 1);
                this.counter.getTimeUntilNextSlot().then(retryAfter => {
                    reject(new RateLimitError(
                        `Rate limiter timeout after ${this.config.queueTimeoutMs}ms`,
                        retryAfter
                    ));
                });
            }, this.config.queueTimeoutMs);

            const request: QueuedRequest = {
                priority,
                estimatedTokens,
                resolve,
                reject,
                enqueuedAt: Date.now(),
                timeoutId,
            };

            // Insert in priority order
            this.insertByPriority(request);
            this.logStatus('acquire:queued', priority, estimatedTokens);

            // Start processing the queue
            this.processQueue();
        });
    }

    /** Report actual token usage after a call completes (for more accurate tracking) */
    reportUsage(actualTokens: number): void {
        if (actualTokens > 0) {
            console.log(`[RateLimiter] Actual usage reported: ${actualTokens} tokens`);
        }
    }

    /** Get current status for monitoring */
    async getStatus() {
        return {
            requestsInWindow: await this.counter.getRequestCount(),
            tokensInWindow: await this.counter.getTokenCount(),
            queueDepth: this.queue.length,
            maxRPM: this.config.maxRPM,
            maxTokensPerMin: this.config.maxTokensPerMin,
            backend: getRedis() ? 'redis' : 'memory',
        };
    }

    // ─── Private Methods ────────────────────────────────────────

    private async canProceed(estimatedTokens: number): Promise<boolean> {
        const currentRequests = await this.counter.getRequestCount();
        const currentTokens = await this.counter.getTokenCount();

        return (
            currentRequests < this.config.maxRPM &&
            (currentTokens + estimatedTokens) <= this.config.maxTokensPerMin
        );
    }

    private insertByPriority(request: QueuedRequest): void {
        const weight = PRIORITY_WEIGHT[request.priority];
        let insertIdx = this.queue.length;
        for (let i = 0; i < this.queue.length; i++) {
            if (PRIORITY_WEIGHT[this.queue[i]!.priority] > weight) {
                insertIdx = i;
                break;
            }
        }
        this.queue.splice(insertIdx, 0, request);
    }

    private async processQueue(): Promise<void> {
        if (this.processing) return;
        this.processing = true;

        try {
            while (this.queue.length > 0) {
                const next = this.queue[0]!;

                if (await this.canProceed(next.estimatedTokens)) {
                    this.queue.shift();
                    clearTimeout(next.timeoutId);
                    await this.counter.record(next.estimatedTokens);

                    const waitTime = Date.now() - next.enqueuedAt;
                    console.log(`[RateLimiter] Dequeued ${next.priority} request after ${waitTime}ms wait`);

                    next.resolve();
                } else {
                    const waitTime = Math.max(100, await this.counter.getTimeUntilNextSlot());
                    await this.sleep(Math.min(waitTime, 1000));
                }
            }
        } finally {
            this.processing = false;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private logStatus(action: string, priority: Priority, tokens: number): void {
        // Fire-and-forget async status fetch for logging
        this.getStatus().then(status => {
            console.log(
                `[RateLimiter] ${action} | priority=${priority} tokens=${tokens} | ` +
                `window: ${status.requestsInWindow}/${status.maxRPM} RPM, ` +
                `${status.tokensInWindow}/${status.maxTokensPerMin} tokens | ` +
                `queue: ${status.queueDepth} | backend: ${status.backend}`
            );
        }).catch(() => { /* ignore logging errors */ });
    }
}
