'use client'
import React from 'react'
import DOMPurify from 'dompurify'
import { motion, AnimatePresence } from 'framer-motion'
import { useAISearch } from '../use-ai-search'
import { useThread } from '../use-thread'
import { api } from '@/trpc/react'
import { useLocalStorage } from 'usehooks-ts'
import { Loader2, Sparkles, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

const AISearchDisplay = () => {
    const [aiSearch, setAISearch] = useAISearch()
    const [, setThreadId] = useThread()
    const [accountId] = useLocalStorage('accountId', '')

    const { data: threads, isLoading } = api.mail.getThreadsByIds.useQuery(
        { accountId, threadIds: aiSearch?.threadIds ?? [] },
        { enabled: !!accountId && !!aiSearch && aiSearch.threadIds.length > 0 }
    )

    if (!aiSearch) return null

    return (
        <div className="p-4 max-h-[calc(100vh-50px)] overflow-y-scroll">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/10">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-medium text-foreground">
                            AI Search Results
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {aiSearch.query}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setAISearch(null)}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    title="Dismiss results"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Results count */}
            <div className="text-xs text-muted-foreground mb-3">
                {isLoading ? (
                    <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading results...
                    </span>
                ) : (
                    `${threads?.length ?? 0} email${(threads?.length ?? 0) !== 1 ? 's' : ''} found`
                )}
            </div>

            {/* Results list */}
            <AnimatePresence>
                {threads && threads.length === 0 && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8"
                    >
                        <p className="text-sm text-muted-foreground">No emails matched your search.</p>
                    </motion.div>
                )}
                <ul className="flex flex-col gap-2">
                    {threads?.map((thread, i) => (
                        <motion.li
                            key={thread.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => {
                                setAISearch(null)
                                setThreadId(thread.id)
                            }}
                            className="group border rounded-lg p-4 hover:bg-accent cursor-pointer transition-all"
                        >
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="text-sm font-medium line-clamp-1">
                                    {thread.subject || '(no subject)'}
                                </h3>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {thread.emails.at(-1)?.sentAt
                                        ? formatDistanceToNow(thread.emails.at(-1)!.sentAt, { addSuffix: true })
                                        : ''}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                                From: {thread.emails.at(-1)?.from?.name || thread.emails.at(-1)?.from?.address || 'Unknown'}
                            </p>
                            <p
                                className="text-xs text-muted-foreground line-clamp-2"
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(
                                        thread.emails.at(-1)?.bodySnippet ?? '',
                                        { USE_PROFILES: { html: true } }
                                    ),
                                }}
                            />
                        </motion.li>
                    ))}
                </ul>
            </AnimatePresence>
        </div>
    )
}

export default AISearchDisplay
