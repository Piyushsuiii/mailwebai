
import { db } from './src/server/db';
import Account from './src/lib/account';
import { syncEmailsToDatabase } from './src/lib/sync-to-db';

async function main() {
    console.log('Starting manual sync...');
    const account = await db.account.findFirst();
    if (!account) {
        console.error('No account found');
        return;
    }

    console.log(`Syncing account: ${account.emailAddress} (${account.id})`);
    const acc = new Account(account.token);

    try {
        console.log('Calling performInitialSync...');
        const response = await acc.performInitialSync();

        if (!response) {
            console.error('performInitialSync returned null/undefined');
            return;
        }

        const { emails, deltaToken } = response;
        console.log(`Fetched ${emails.length} emails. Delta token: ${deltaToken}`);

        if (emails.length > 0) {
            console.log('Sample email:', JSON.stringify(emails[0], null, 2));
            console.log('Calling syncEmailsToDatabase...');
            await syncEmailsToDatabase(emails, account.id);
            console.log('Sync to database complete.');
        } else {
            console.log('No emails to sync.');
        }

    } catch (error) {
        console.error('Error during manual sync:', error);
    }
}

main();
