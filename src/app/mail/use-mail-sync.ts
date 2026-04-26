'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { api } from '@/trpc/react'

const SYNC_INTERVAL_MS = 30_000 // 30 seconds

/**
 * Hook that automatically syncs emails from the provider (Aurinko)
 * into the local database at a regular interval.
 *
 * The existing `useThreads` hook already re-fetches threads from the DB
 * every 5 seconds, so once syncEmails writes new data, it will appear
 * in the UI within a few seconds.
 */
const useMailSync = () => {
    const [accountId] = useLocalStorage('accountId', '')
    const syncEmails = api.mail.syncEmails.useMutation()
    const syncInProgress = useRef(false)

    const doSync = useCallback(() => {
        if (!accountId || syncInProgress.current) return

        syncInProgress.current = true
        syncEmails.mutate(
            { accountId },
            {
                onSettled: () => {
                    syncInProgress.current = false
                },
            }
        )
    }, [accountId, syncEmails])

    useEffect(() => {
        if (!accountId) return

        // Sync immediately on mount
        doSync()

        // Then sync every SYNC_INTERVAL_MS
        const interval = setInterval(doSync, SYNC_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [accountId]) // intentionally only depend on accountId to avoid re-creating interval

    return { isSyncing: syncEmails.isPending }
}

export default useMailSync
