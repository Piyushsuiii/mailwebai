import { api } from '@/trpc/react'
import { getQueryKey } from '@trpc/react-query'
import React from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { useMailFilter } from './use-mail-filter'

const useThreads = () => {
    const { data: accounts } = api.mail.getAccounts.useQuery()
    const [accountId] = useLocalStorage('accountId', '')
    const [tab] = useLocalStorage('normalhuman-tab', 'inbox')
    const [done] = useLocalStorage('normalhuman-done', false)
    const [filter] = useMailFilter()

    const queryInput = {
        accountId,
        done,
        tab,
        ...(filter?.dateFrom ? { dateFrom: filter.dateFrom } : {}),
        ...(filter?.dateTo ? { dateTo: filter.dateTo } : {}),
        ...(filter?.sender ? { sender: filter.sender } : {}),
        ...(filter?.keyword ? { keyword: filter.keyword } : {}),
        ...(filter?.readStatus && filter.readStatus !== 'all' ? { readStatus: filter.readStatus } : {}),
    }

    const queryKey = getQueryKey(api.mail.getThreads, queryInput, 'query')
    const { data: threads, isFetching, refetch } = api.mail.getThreads.useQuery(
        queryInput,
        { enabled: !!accountId && !!tab, placeholderData: (e) => e, refetchInterval: 1000 * 15 }
    )

    return {
        threads,
        isFetching,
        account: accounts?.find((account) => account.id === accountId),
        refetch,
        accounts,
        queryKey,
        accountId
    }
}

export default useThreads