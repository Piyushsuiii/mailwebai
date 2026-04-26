import { NextResponse } from 'next/server';
import { rateLimitedStreamText, gemini as openai, RateLimitError } from '@/lib/gemini-client';
import { validateRequest } from '@/lib/auth';
import { acquireUserRateLimit, UserRateLimitError } from '@/lib/user-rate-limiter';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(req: Request) {
    try {
        const { user } = await validateRequest();
        const userId = user?.id;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Per-user rate limit: 30 RPM — queues request until a slot opens
        await acquireUserRateLimit(userId);

        const { prompt } = await req.json();

        const result = await rateLimitedStreamText({
            model: openai('gemini-1.5-flash'),
            system: `You are a helpful AI embedded in a notion text editor app that is used to autocomplete sentences.
            The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
            AI is a well-behaved and well-mannered individual.
            AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.`,
            prompt: `I am writing a piece of text in a notion text editor app.
            Help me complete my train of thought here: ##${prompt}##
            keep the tone of the text consistent with the rest of the text.
            keep the response short and sweet.`,
        }, 'low');

        return result.toDataStreamResponse();
    } catch (error) {
        if (error instanceof UserRateLimitError) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again shortly.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)) } }
            );
        }
        if (error instanceof RateLimitError) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again shortly.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)) } }
            );
        }
        console.error('[Completion] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
