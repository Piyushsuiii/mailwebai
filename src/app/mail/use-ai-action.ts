import { atom, useAtom } from 'jotai'
import type { AIAction } from '@/lib/ai-actions'

// Global atom to broadcast AI actions to UI components
const aiActionAtom = atom<AIAction | null>(null)

export function useAIAction() {
    return useAtom(aiActionAtom)
}
