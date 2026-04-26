'use server';

import { createStreamableValue } from 'ai/rsc';
import { rateLimitedStreamText, gemini as openai } from '@/lib/gemini-client';

export async function generate(input: string) {
    const stream = createStreamableValue('');

    console.log("input", input);
    (async () => {
        const { textStream } = await rateLimitedStreamText({
            model: openai('gemini-1.5-flash'),
            prompt: `
            You are a helpful AI embedded in a email client app that is used to answer questions about the emails in the inbox.
            ${input}
            `,
        }, 'normal');

        for await (const delta of textStream) {
            stream.update(delta);
        }

        stream.done();
    })();

    return { output: stream.value };
}