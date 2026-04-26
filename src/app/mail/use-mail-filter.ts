import { atom, useAtom } from 'jotai'

export type MailFilter = {
    dateFrom?: string     // ISO date string e.g. "2026-02-01"
    dateTo?: string       // ISO date string e.g. "2026-02-14"
    sender?: string       // partial name/email match
    keyword?: string      // subject/body search
    readStatus?: 'all' | 'read' | 'unread'
} | null

const mailFilterAtom = atom<MailFilter>(null)

export function useMailFilter() {
    return useAtom(mailFilterAtom)
}
