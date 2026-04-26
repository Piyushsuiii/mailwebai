import { atom, useAtom } from 'jotai'

export type AISearchState = {
    query: string
    threadIds: string[]
} | null

const aiSearchAtom = atom<AISearchState>(null)

export function useAISearch() {
    return useAtom(aiSearchAtom)
}
