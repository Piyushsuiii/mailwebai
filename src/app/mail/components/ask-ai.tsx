
'use client'

import React, { useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowUp, Bot } from 'lucide-react'
import { useLocalStorage } from 'usehooks-ts'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import PremiumBanner from './premium-banner'
import { useAIAction } from '../use-ai-action'
import { useAISearch } from '../use-ai-search'
import { useThread } from '../use-thread'
import { useMailFilter, type MailFilter } from '../use-mail-filter'
import type { AIAction } from '@/lib/ai-actions'
import AIEmailDisplay from './ai-email-display'

const AskAI = ({ isCollapsed }: { isCollapsed: boolean }) => {
    const [accountId] = useLocalStorage('accountId', '')
    const scrollRef = useRef<HTMLDivElement>(null)
    const [, setAIAction] = useAIAction()
    const [aiSearch, setAISearch] = useAISearch()
    const [threadId, setThreadId] = useThread()
    const [, setMailFilter] = useMailFilter()
    const processedInvocationsRef = useRef<Set<string>>(new Set())

    // Use a ref for threadId so useChat body always gets the latest value
    const threadIdRef = useRef(threadId)
    threadIdRef.current = threadId

    const { input, handleInputChange, handleSubmit, messages, isLoading } = useChat({
        api: "/api/chat",
        body: { accountId },
        onError: (error) => {
            console.error('[CHAT UI] Error:', error);
            if (error.message.includes('Limit reached')) {
                toast.error('Daily limit reached. Upgrade to Pro for unlimited access.')
            } else {
                toast.error('Something went wrong. Please try again.')
            }
        },
        initialMessages: [],
        maxSteps: 5,
        onToolCall: async ({ toolCall }) => {
            console.log('[ASK-AI] onToolCall:', toolCall.toolName, toolCall.args)
            // smart_search and open_email execute server-side
            if (toolCall.toolName === 'smart_search' || toolCall.toolName === 'open_email') {
                const label = toolCall.toolName === 'smart_search' ? '🔍 Searching emails with AI...' : '📨 Finding email...'
                toast.info(label)
                return undefined // Server-side execute handles it
            }

            // Dispatch AI action to the global Jotai atom
            const action = {
                type: toolCall.toolName,
                ...(toolCall.args as Record<string, unknown>),
            } as AIAction

            setAIAction(action)

            // Show a toast for feedback
            switch (toolCall.toolName) {
                case 'compose_email':
                    toast.info('Opening compose view...')
                    break
                case 'navigate':
                    toast.info(`Navigating to ${(toolCall.args as any).tab}...`)
                    break
                case 'search_emails':
                    toast.info('Searching emails...')
                    break
            }

            return `Action ${toolCall.toolName} dispatched successfully`
        },
        onFinish: (message) => {
            // This fires after ALL streaming steps are complete for a response
            // Reliable way to detect tool results
            console.log('[ASK-AI] onFinish - message:', message.id, 'toolInvocations:', message.toolInvocations?.length ?? 0)
            if (!message.toolInvocations) return

            for (const invocation of message.toolInvocations) {
                const invocationKey = `finish-${message.id}-${invocation.toolName}-${(invocation as any).toolCallId ?? ''}`
                if (processedInvocationsRef.current.has(invocationKey)) continue

                if (invocation.toolName === 'open_email' && invocation.state === 'result') {
                    const result = invocation.result as any
                    console.log('[ASK-AI] onFinish open_email result:', result)
                    if (result?.success && result?.threadId) {
                        processedInvocationsRef.current.add(invocationKey)
                        setAISearch(null)
                        console.log('[ASK-AI] onFinish: setting threadId to', result.threadId)
                        setThreadId(result.threadId)
                    }
                }

                if (invocation.toolName === 'smart_search' && invocation.state === 'result') {
                    const result = invocation.result as any
                    if (result?.success && result?.threadIds?.length > 0) {
                        processedInvocationsRef.current.add(invocationKey)
                        const args = invocation.args as Record<string, string>
                        const queryParts: string[] = []
                        if (args.from) queryParts.push(`from: ${args.from}`)
                        if (args.to) queryParts.push(`to: ${args.to}`)
                        if (args.subject) queryParts.push(`subject: ${args.subject}`)
                        if (args.keyword) queryParts.push(`keyword: ${args.keyword}`)
                        if (args.dateFrom) queryParts.push(`after: ${args.dateFrom}`)
                        if (args.dateTo) queryParts.push(`before: ${args.dateTo}`)
                        setAISearch({
                            query: queryParts.join(', ') || 'AI search',
                            threadIds: result.threadIds,
                        })
                        setThreadId(null) // Close the current thread to show the search results list
                        const filterUpdate: NonNullable<MailFilter> = {}
                        if (args.from) filterUpdate.sender = args.from
                        if (args.keyword) filterUpdate.keyword = args.keyword
                        if (args.dateFrom) filterUpdate.dateFrom = args.dateFrom
                        if (args.dateTo) filterUpdate.dateTo = args.dateTo
                        if ((args as any).labels?.includes('unread')) filterUpdate.readStatus = 'unread'
                        if (Object.keys(filterUpdate).length > 0) {
                            setMailFilter(filterUpdate)
                        }
                    }
                }
            }
        },
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages]);

    // Watch for tool results in messages (backup alongside onFinish)
    useEffect(() => {
        for (const message of messages) {
            if (!message.toolInvocations) continue
            for (const invocation of message.toolInvocations) {
                const invocationKey = `${message.id}-${invocation.toolName}-${invocation.state}`
                if (processedInvocationsRef.current.has(invocationKey)) continue

                // Log all tool states for debugging
                if (invocation.toolName === 'open_email' || invocation.toolName === 'smart_search') {
                    console.log('[ASK-AI] useEffect saw:', invocation.toolName, 'state:', invocation.state, 'result:', invocation.state === 'result' ? (invocation as any).result : 'N/A')
                }

                if (
                    invocation.toolName === 'smart_search' &&
                    invocation.state === 'result' &&
                    invocation.result?.success &&
                    invocation.result?.threadIds?.length > 0
                ) {
                    processedInvocationsRef.current.add(invocationKey)
                    const args = invocation.args as Record<string, string>
                    const queryParts: string[] = []
                    if (args.from) queryParts.push(`from: ${args.from}`)
                    if (args.to) queryParts.push(`to: ${args.to}`)
                    if (args.subject) queryParts.push(`subject: ${args.subject}`)
                    if (args.keyword) queryParts.push(`keyword: ${args.keyword}`)
                    if (args.dateFrom) queryParts.push(`after: ${args.dateFrom}`)
                    if (args.dateTo) queryParts.push(`before: ${args.dateTo}`)

                    setAISearch({
                        query: queryParts.join(', ') || 'AI search',
                        threadIds: invocation.result.threadIds,
                    })
                    setThreadId(null) // Close the current thread to show the search results list

                    // Also set the filter atom so UI filter bar reflects the AI search
                    const filterUpdate: NonNullable<MailFilter> = {}
                    if (args.from) filterUpdate.sender = args.from
                    if (args.keyword) filterUpdate.keyword = args.keyword
                    if (args.dateFrom) filterUpdate.dateFrom = args.dateFrom
                    if (args.dateTo) filterUpdate.dateTo = args.dateTo
                    if (args.labels?.includes('unread')) filterUpdate.readStatus = 'unread'
                    if (Object.keys(filterUpdate).length > 0) {
                        setMailFilter(filterUpdate)
                    }
                }

                // Handle open_email results
                if (
                    invocation.toolName === 'open_email' &&
                    invocation.state === 'result' &&
                    invocation.result?.success &&
                    invocation.result?.threadId
                ) {
                    processedInvocationsRef.current.add(invocationKey)
                    setAISearch(null)
                    console.log('[ASK-AI] useEffect: setting threadId to', invocation.result.threadId)
                    setThreadId(invocation.result.threadId)
                }
            }
        }
    }, [messages]);

    if (isCollapsed) return null;

    return (
        // CHANGED: Increased mb-2 to mb-20 to clear the footer area
        <div className="w-full px-2 mb-2 mt-auto">
            <PremiumBanner />
            <div className="h-4"></div>

            <motion.div
                layout
                className="relative flex flex-col w-full bg-[#1F1F23] border border-zinc-800/50 rounded-2xl overflow-hidden shadow-sm"
                initial={false}
                animate={{
                    // 400px when chatting, 'auto' when empty
                    height: messages.length > 0 ? 400 : "auto"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {/* Scrollable Content Area */}
                <div
                    ref={scrollRef}
                    className={cn(
                        "flex-1 overflow-y-auto px-4 py-3 scrollbar-hide scroll-smooth",
                        messages.length > 0 ? "min-h-0" : "flex flex-col justify-center"
                    )}
                >
                    <AnimatePresence mode="popLayout" initial={false}>
                        {messages.length === 0 ? (
                            // EMPTY STATE
                            <motion.div
                                key="empty-state"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-indigo-500 fill-indigo-500/20" />
                                    <h2 className="font-semibold text-sm text-zinc-100">
                                        Ask AI
                                    </h2>
                                </div>
                                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                                    Ask questions or command your inbox with natural language
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {[
                                        "What can I ask?",
                                        "Send an email to...",
                                        "Show me sent emails",
                                        "Show unread from this week",
                                    ].map((text, i) => (
                                        <motion.button
                                            key={text}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.1 }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleInputChange({ target: { value: text } } as any)}
                                            className="px-2.5 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 text-[11px] font-medium text-zinc-300 rounded-lg transition-colors border border-transparent hover:border-zinc-700"
                                        >
                                            {text}
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            // CHAT STATE
                            <div className="space-y-3 pt-2">
                                {messages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        layout="position"
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        className={cn(
                                            "flex w-full",
                                            message.role === 'user' ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {/* Show tool invocations as action cards */}
                                        {message.toolInvocations && message.toolInvocations.length > 0 ? (
                                            <div className="flex flex-col gap-2 w-full">
                                                {message.toolInvocations.map((invocation: any, idx: number) => (
                                                    <div key={idx} className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-950/50 border border-indigo-800/30 text-xs text-indigo-300">
                                                            <Bot className="w-3.5 h-3.5 flex-shrink-0" />
                                                            <span>
                                                                {invocation.toolName === 'compose_email' && '✉️ Opening compose view...'}
                                                                {invocation.toolName === 'navigate' && `📂 Navigating to ${invocation.args?.tab}...`}
                                                                {invocation.toolName === 'search_emails' && `🔍 Searching: "${invocation.args?.query}"...`}
                                                                {invocation.toolName === 'smart_search' && `🔎 Smart searching emails...`}
                                                                {invocation.toolName === 'open_email' && `📨 Opening email...`}
                                                            </span>
                                                        </div>
                                                        {/* Render rich email results if available */}
                                                        {invocation.state === 'result' && (
                                                            <>
                                                                {invocation.toolName === 'smart_search' && invocation.result?.results?.length > 0 && (
                                                                    <div className="mt-2">
                                                                        <AIEmailDisplay
                                                                            emails={invocation.result.results.map((r: any) => ({
                                                                                threadId: r.threadId,
                                                                                subject: r.subject,
                                                                                from: r.from,
                                                                                date: r.lastMessageDate,
                                                                                snippet: r.snippet
                                                                            }))}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {invocation.toolName === 'open_email' && invocation.result?.success && (
                                                                    <div className="mt-2">
                                                                        <AIEmailDisplay
                                                                            emails={[{
                                                                                threadId: invocation.result.threadId,
                                                                                subject: invocation.result.subject,
                                                                                from: invocation.result.from,
                                                                                date: new Date().toISOString(), // Use current time or fetch if available
                                                                                snippet: invocation.result.snippet
                                                                            }]}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                {message.content && (
                                                    <div className="px-3 py-2 rounded-xl text-xs max-w-[90%] leading-relaxed shadow-sm break-words bg-zinc-800 text-zinc-300 border border-zinc-700/50 rounded-bl-none">
                                                        {message.content}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "px-3 py-2 rounded-xl text-xs max-w-[90%] leading-relaxed shadow-sm break-words",
                                                message.role === 'user'
                                                    ? "bg-indigo-600 text-white rounded-br-none"
                                                    : "bg-zinc-800 text-zinc-300 border border-zinc-700/50 rounded-bl-none"
                                            )}>
                                                {message.content}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-start"
                                    >
                                        <div className="flex gap-1 bg-zinc-800 px-3 py-2.5 rounded-xl rounded-bl-none border border-zinc-700/50">
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Input Area */}
                <div className="p-3 bg-zinc-900/30 backdrop-blur-sm border-t border-zinc-800/50">
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        handleSubmit(e, { body: { threadId: threadIdRef.current } })
                    }} className="relative flex items-center">
                        <input
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask AI or give a command..."
                            className="w-full pl-3 pr-10 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/20 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className={cn(
                                "absolute right-1.5 p-1.5 rounded-lg transition-all duration-200",
                                input.trim()
                                    ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700"
                                    : "bg-transparent text-zinc-400 cursor-not-allowed"
                            )}
                        >
                            <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}

export default AskAI