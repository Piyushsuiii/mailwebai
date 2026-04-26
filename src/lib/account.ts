import type { EmailHeader, EmailMessage, SyncResponse, SyncUpdatedResponse, OutgoingEmailAttachment } from '@/lib/types';
import { db } from '@/server/db';
import axios from 'axios';
import { syncEmailsToDatabase } from './sync-to-db';

const API_BASE_URL = 'https://api.aurinko.io/v1';

class Account {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    private async startSync(daysWithin: number): Promise<SyncResponse> {
        const response = await axios.post<SyncResponse>(
            `${API_BASE_URL}/email/sync`,
            {},
            {
                headers: { Authorization: `Bearer ${this.token}` }, params: {
                    daysWithin,
                    bodyType: 'html'
                }
            }
        );
        return response.data;
    }

    async createSubscription() {
        const webhookUrl = process.env.NEXT_PUBLIC_URL
        const res = await axios.post('https://api.aurinko.io/v1/subscriptions',
            {
                resource: '/email/messages',
                notificationUrl: webhookUrl + '/api/aurinko/webhook'
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        return res.data
    }

    async syncEmails() {
        const account = await db.account.findUnique({
            where: {
                token: this.token
            },
        })
        if (!account) throw new Error("Invalid token")

        // If no delta token exists, run initial sync to bootstrap it
        if (!account.nextDeltaToken) {
            console.log('No delta token found, performing initial sync...')
            const result = await this.performInitialSync(20) // Use limit for improved UX
            if (!result) {
                console.log('Initial sync failed or returned no data')
                return
            }
            await db.account.update({
                where: { id: account.id },
                data: { nextDeltaToken: result.deltaToken }
            })
            await syncEmailsToDatabase(result.emails, account.id)
            console.log('Initial sync complete, delta token saved')

            if (result.nextPageToken) {
                await this.syncRemainingEmails(result.nextPageToken, result.deltaToken)
            }
            return
        }

        let response = await this.getUpdatedEmails({ deltaToken: account.nextDeltaToken })
        let allEmails: EmailMessage[] = response.records
        let storedDeltaToken = account.nextDeltaToken
        if (response.nextDeltaToken) {
            storedDeltaToken = response.nextDeltaToken
        }
        while (response.nextPageToken) {
            response = await this.getUpdatedEmails({ pageToken: response.nextPageToken });
            allEmails = allEmails.concat(response.records);
            if (response.nextDeltaToken) {
                storedDeltaToken = response.nextDeltaToken
            }
        }

        if (!response) throw new Error("Failed to sync emails")

        try {
            await syncEmailsToDatabase(allEmails, account.id)
        } catch (error) {
            console.log('error', error)
        }

        await db.account.update({
            where: {
                id: account.id,
            },
            data: {
                nextDeltaToken: storedDeltaToken,
            }
        })
    }

    async getUpdatedEmails({ deltaToken, pageToken }: { deltaToken?: string, pageToken?: string }): Promise<SyncUpdatedResponse> {
        // console.log('getUpdatedEmails', { deltaToken, pageToken });
        let params: Record<string, string> = {};
        if (deltaToken) {
            params.deltaToken = deltaToken;
        }
        if (pageToken) {
            params.pageToken = pageToken;
        }
        const response = await axios.get<SyncUpdatedResponse>(
            `${API_BASE_URL}/email/sync/updated`,
            {
                params,
                headers: { Authorization: `Bearer ${this.token}` }
            }
        );
        return response.data;
    }

    async performInitialSync(limit?: number) {
        try {
            // Start the sync process
            const daysWithin = 10 // Increased to 10 days
            let syncResponse = await this.startSync(daysWithin); // Sync emails from the last 3 days

            // Wait until the sync is ready
            let retries = 0
            while (!syncResponse.ready && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
                syncResponse = await this.startSync(daysWithin);
                retries++
            }
            if (!syncResponse.ready) {
                console.error('Sync failed to become ready after 10 retries')
                return
            }

            // console.log('Sync is ready. Tokens:', syncResponse);

            // Perform initial sync of updated emails
            let storedDeltaToken: string = syncResponse.syncUpdatedToken
            let updatedResponse = await this.getUpdatedEmails({ deltaToken: syncResponse.syncUpdatedToken });
            // console.log('updatedResponse', updatedResponse)
            if (updatedResponse.nextDeltaToken) {
                storedDeltaToken = updatedResponse.nextDeltaToken
            }
            let allEmails: EmailMessage[] = updatedResponse.records;

            if (limit && allEmails.length >= limit) {
                return {
                    emails: allEmails.slice(0, limit),
                    deltaToken: storedDeltaToken,
                    nextPageToken: updatedResponse.nextPageToken
                }
            }

            // Fetch all pages if there are more
            while (updatedResponse.nextPageToken) {
                updatedResponse = await this.getUpdatedEmails({ pageToken: updatedResponse.nextPageToken });
                allEmails = allEmails.concat(updatedResponse.records);
                if (updatedResponse.nextDeltaToken) {
                    storedDeltaToken = updatedResponse.nextDeltaToken
                }
                if (limit && allEmails.length >= limit) {
                    return {
                        emails: allEmails.slice(0, limit),
                        deltaToken: storedDeltaToken,
                        nextPageToken: updatedResponse.nextPageToken
                    }
                }
            }

            // console.log('Initial sync complete. Total emails:', allEmails.length);

            return {
                emails: allEmails,
                deltaToken: storedDeltaToken,
                nextPageToken: undefined
            }

        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error during sync:', JSON.stringify(error.response?.data, null, 2));
            } else {
                console.error('Error during sync:', error);
            }
        }
    }

    async syncRemainingEmails(nextPageToken: string, deltaToken: string) {
        try {
            let updatedResponse = await this.getUpdatedEmails({ pageToken: nextPageToken });
            let storedDeltaToken = deltaToken
            if (updatedResponse.nextDeltaToken) {
                storedDeltaToken = updatedResponse.nextDeltaToken
            }

            // Process first batch of remaining emails
            const account = await db.account.findUnique({ where: { token: this.token } })
            if (!account) return
            await syncEmailsToDatabase(updatedResponse.records, account.id)

            while (updatedResponse.nextPageToken) {
                updatedResponse = await this.getUpdatedEmails({ pageToken: updatedResponse.nextPageToken });
                if (updatedResponse.nextDeltaToken) {
                    storedDeltaToken = updatedResponse.nextDeltaToken
                }
                await syncEmailsToDatabase(updatedResponse.records, account.id)
            }

            await db.account.update({
                where: { id: account.id },
                data: { nextDeltaToken: storedDeltaToken }
            })
            console.log('Background sync complete')

        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error during background sync:', JSON.stringify(error.response?.data, null, 2));
            } else {
                console.error('Error during background sync:', error);
            }
        }
    }


    async sendEmail({
        from,
        subject,
        body,
        inReplyTo,
        references,
        threadId,
        to,
        cc,
        bcc,
        replyTo,
        attachments
    }: {
        from: EmailAddress;
        subject: string;
        body: string;
        inReplyTo?: string;
        references?: string;
        threadId?: string;
        to: EmailAddress[];
        cc?: EmailAddress[];
        bcc?: EmailAddress[];
        replyTo?: EmailAddress;
        attachments?: OutgoingEmailAttachment[];
    }) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/email/messages`,
                {
                    from,
                    subject,
                    body,
                    inReplyTo,
                    references,
                    threadId,
                    to,
                    cc,
                    bcc,
                    replyTo: replyTo ? [replyTo] : undefined,
                    attachments
                },
                {
                    params: {
                        returnIds: true
                    },
                    headers: { Authorization: `Bearer ${this.token}` }
                }
            );

            console.log('sendmail', response.data)
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error sending email:', JSON.stringify(error.response?.data, null, 2));
            } else {
                console.error('Error sending email:', error);
            }
            throw error;
        }
    }

    async forwardEmail({
        messageId,
        to,
        cc,
        bcc,
        body
    }: {
        messageId: string;
        to: EmailAddress[];
        cc?: EmailAddress[];
        bcc?: EmailAddress[];
        body?: string;
    }) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/email/messages/${messageId}/forward`,
                {
                    to,
                    cc,
                    bcc,
                    body
                },
                {
                    params: {
                        returnIds: true
                    },
                    headers: { Authorization: `Bearer ${this.token}` }
                }
            );
            console.log('forwardEmail', response.data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error forwarding email:', JSON.stringify(error.response?.data, null, 2));
            } else {
                console.error('Error forwarding email:', error);
            }
            throw error;
        }
    }


    async getWebhooks() {
        type Response = {
            records: {
                id: number;
                resource: string;
                notificationUrl: string;
                active: boolean;
                failSince: string;
                failDescription: string;
            }[];
            totalSize: number;
            offset: number;
            done: boolean;
        }
        const res = await axios.get<Response>(`${API_BASE_URL}/subscriptions`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data
    }

    async createWebhook(resource: string, notificationUrl: string) {
        const res = await axios.post(`${API_BASE_URL}/subscriptions`, {
            resource,
            notificationUrl
        }, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data
    }

    async deleteWebhook(subscriptionId: string) {
        const res = await axios.delete(`${API_BASE_URL}/subscriptions/${subscriptionId}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data
    }
}
type EmailAddress = {
    name: string;
    address: string;
}

export default Account;
