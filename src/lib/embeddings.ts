import { rateLimitedGetEmbeddings } from "./gemini-client";

/**
 * Get embeddings for a text string.
 * Routes through the rate limiter with 'low' priority.
 */
export async function getEmbeddings(text: string): Promise<number[]> {
    return rateLimitedGetEmbeddings(text);
}
