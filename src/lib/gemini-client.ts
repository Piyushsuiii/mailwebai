/**
 * Rate-Limited Gemini Client Wrapper
 * 
 * Drop-in replacements for AI API calls in the app.
 * Routes every call through the singleton RateLimiter.
 */

import { streamText, embed } from 'ai';
import { google } from '@ai-sdk/google';
import { OpenAIRateLimiter, RateLimitError, type Priority } from './rate-limiter';

// Re-export for convenience
// We export `google` as `gemini` if needed, but we can just export `gemini` function wrapper.
export const gemini = google;

export { RateLimitError };
export type { Priority };

// ─── Token Estimation ────────────────────────────────────────────

/**
 * Rough token estimate for a string.
 * ~4 chars per token is the standard approximation for English text.
 * This avoids needing a tokenizer dependency.
 */
function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/** Estimate tokens from a messages array (chat format) */
function estimateMessagesTokens(messages: Array<{ role: string; content: any }>): number {
    if (!messages || !Array.isArray(messages)) return 0;
    let total = 0;
    for (const msg of messages) {
        total += 4; // overhead per message (role, separators)
        if (typeof msg.content === 'string') {
            total += estimateTokens(msg.content);
        } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'text' && typeof part.text === 'string') {
                    total += estimateTokens(part.text);
                }
            }
        }
    }
    return total;
}

// ─── Rate-Limited streamText ─────────────────────────────────────

/**
 * Drop-in replacement for AI SDK's `streamText`.
 * Acquires a rate limiter slot before calling the underlying function.
 */
export async function rateLimitedStreamText(
    options: Parameters<typeof streamText>[0],
    priority: Priority = 'normal'
): Promise<ReturnType<typeof streamText>> {
    const limiter = OpenAIRateLimiter.getInstance();

    // Estimate input tokens from system prompt + messages
    let estimatedTokens = 0;
    if (typeof options.system === 'string') {
        estimatedTokens += estimateTokens(options.system);
    }
    if ('prompt' in options && typeof options.prompt === 'string') {
        estimatedTokens += estimateTokens(options.prompt);
    }
    if ('messages' in options && Array.isArray(options.messages)) {
        estimatedTokens += estimateMessagesTokens(options.messages as Array<{ role: string; content: any }>);
    }

    // Acquire slot (will queue if at capacity)
    await limiter.acquire(priority, estimatedTokens);

    // Make the actual call
    return streamText(options);
}

// ─── Rate-Limited Embeddings ─────────────────────────────────────

/**
 * Rate-limited replacement for the getEmbeddings function.
 * Uses the AI SDK's Google provider.
 */
export async function rateLimitedGetEmbeddings(text: string): Promise<number[]> {
    const limiter = OpenAIRateLimiter.getInstance();
    const estimatedTokens = estimateTokens(text);

    // Embeddings are low priority (background indexing)
    await limiter.acquire('low', estimatedTokens);

    try {
        const { embedding } = await embed({
            model: google.textEmbeddingModel('text-embedding-004'),
            value: text.replace(/\n/g, ' '),
        });
        
        return embedding;
    } catch (error) {
        console.error('[RateLimitedClient] Embeddings error:', error);
        throw error;
    }
}

// ─── Status Endpoint Helper ──────────────────────────────────────

/** Get current rate limiter status (for /api/health or monitoring) */
export async function getRateLimiterStatus() {
    return OpenAIRateLimiter.getInstance().getStatus();
}
