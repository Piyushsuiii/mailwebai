import { create, insert, search } from '@orama/orama';
import { OpenAIApi, Configuration } from "openai-edge";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(text: string) {
    try {
        const response = await openai.createEmbedding({
            model: "text-embedding-ada-002",
            input: text.replace(/\n/g, " "),
        });
        const result = await response.json();
        return result.data[0].embedding as number[];
    } catch (error) {
        console.log("error calling openai embeddings api", error);
        throw error;
    }
}


const MOCK_ACCOUNT_ID = 'test-account';

async function main() {
    console.log("Starting Orama Test...");

    if (!process.env.OPENAI_API_KEY) {
        console.error("Error: OPENAI_API_KEY is missing in .env file");
        process.exit(1);
    }

    console.log("Since we can't easily query the real DB without setup, we are testing Orama directly.");

    const schema = {
        title: "string",
        body: "string",
        rawBody: "string",
        from: 'string',
        to: 'string[]',
        sentAt: 'string',
        embeddings: 'vector[1536]',
        threadId: 'string'
    } as const;

    const orama = await create({ schema });

    // Insert a document 
    await insert(orama, {
        title: "Weekly Sync",
        body: "Let's catch up regarding the project progress next tuesday.",
        rawBody: "Let's catch up regarding the project progress next tuesday.",
        from: "Alice <alice@example.com>",
        to: ["Bob <bob@example.com>"],
        sentAt: new Date().toISOString(),
        embeddings: await getEmbeddings("Let's catch up regarding the project progress next tuesday."),
        threadId: "thread-1"
    });

    const prompt1 = "meeting next week";
    const embedding1 = await getEmbeddings(prompt1);
    console.log(`\nSearching for: "${prompt1}"`);

    const highSimilarityResults1 = await search(orama, {
        mode: 'hybrid',
        term: prompt1,
        vector: {
            value: embedding1,
            property: 'embeddings'
        },
        similarity: 0.80,
        limit: 10,
    });
    console.log(`Hits with similarity 0.80: ${highSimilarityResults1.hits.length}`);

    const lowSimilarityResults1 = await search(orama, {
        mode: 'hybrid',
        term: prompt1,
        vector: {
            value: embedding1,
            property: 'embeddings'
        },
        similarity: 0.50,
        limit: 10,
    });
    console.log(`Hits with similarity 0.50: ${lowSimilarityResults1.hits.length}`);


    const prompt2 = "schedule a discussion";
    const embedding2 = await getEmbeddings(prompt2);

    console.log(`\nSearching for: "${prompt2}"`);

    const highSimilarityResults2 = await search(orama, {
        mode: 'hybrid',
        term: prompt2,
        vector: {
            value: embedding2,
            property: 'embeddings'
        },
        similarity: 0.80,
        limit: 10,
    });
    console.log(`Hits for "${prompt2}" with similarity 0.80: ${highSimilarityResults2.hits.length}`);

    const lowSimilarityResults2 = await search(orama, {
        mode: 'hybrid',
        term: prompt2,
        vector: {
            value: embedding2,
            property: 'embeddings'
        },
        similarity: 0.50,
        limit: 10,
    });
    console.log(`Hits for "${prompt2}" with similarity 0.50: ${lowSimilarityResults2.hits.length}`);

}

main().catch(console.error);
