
import { db } from './src/server/db';

async function main() {
    console.log('Checking database content...');

    try {
        const accounts = await db.account.findMany();
        console.log(`Found ${accounts.length} accounts.`);

        for (const account of accounts) {
            console.log(`Account: ${account.emailAddress} (${account.id})`);

            const threads = await db.thread.count({ where: { accountId: account.id } });
            console.log(`  - Threads: ${threads}`);

            const inboxThreads = await db.thread.count({ where: { accountId: account.id, inboxStatus: true } });
            console.log(`  - Inbox Threads: ${inboxThreads}`);

            const doneThreads = await db.thread.count({ where: { accountId: account.id, done: true } });
            console.log(`  - Done Threads: ${doneThreads}`);

            const emails = await db.email.count({ where: { thread: { accountId: account.id } } });
            console.log(`  - Emails: ${emails}`);

            if (threads > 0) {
                const firstThread = await db.thread.findFirst({
                    where: { accountId: account.id },
                    include: { emails: true }
                });
                console.log('  - First Thread Sample:', JSON.stringify(firstThread, null, 2));
            }
        }
    } catch (error) {
        console.error('Error querying database:', error);
    }
}

main();
