'use client'
import React, { useState } from 'react'
import { File, Inbox, Send } from "lucide-react"
import { useLocalStorage } from 'usehooks-ts'
import { api } from '@/trpc/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from "@/lib/utils"
import { useAIAction } from '../use-ai-action'

type Props = { isCollapsed: boolean }

const SideBar = ({ isCollapsed }: Props) => {
    const [tab, setTab] = useLocalStorage("normalhuman-tab", "inbox")
    const [accountId] = useLocalStorage("accountId", "")
    const [hoveredTab, setHoveredTab] = useState<string | null>(null)
    const [done, setDone] = useLocalStorage('normalhuman-done', false)
    const [aiAction, setAIAction] = useAIAction()

    // Listen for AI navigate actions
    React.useEffect(() => {
        if (aiAction?.type !== 'navigate') return
        if (aiAction.tab === 'done') {
            setDone(true)
        } else {
            setDone(false)
            setTab(aiAction.tab)
        }
        setAIAction(null)
    }, [aiAction])

    const refetchInterval = 5000
    const queryOptions = { enabled: !!accountId && !!tab, refetchInterval }

    const { data: inboxThreads } = api.mail.getNumThreads.useQuery({ accountId, tab: "inbox" }, queryOptions)
    const { data: draftsThreads } = api.mail.getNumThreads.useQuery({ accountId, tab: "drafts" }, queryOptions)
    const { data: sentThreads } = api.mail.getNumThreads.useQuery({ accountId, tab: "sent" }, queryOptions)

    const links = [
        {
            title: "Inbox",
            id: "inbox",
            label: inboxThreads?.toString() || "0",
            icon: Inbox,
            color: "from-blue-600 to-blue-400"
        },
        {
            title: "Drafts",
            id: "drafts",
            label: draftsThreads?.toString() || "0",
            icon: File,
            color: "from-zinc-500 to-zinc-300"
        },
        {
            title: "Sent",
            id: "sent",
            label: sentThreads?.toString() || "0",
            icon: Send,
            color: "from-orange-500 to-orange-300"
        },
    ]

    return (
        <div
            data-collapsed={isCollapsed}
            className="group flex flex-col gap-4 py-4 data-[collapsed=true]:py-4 bg-transparent"
        >
            <nav className="grid gap-2 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
                {links.map((link) => {
                    const isActive = tab === link.id

                    return (
                        <button
                            key={link.id}
                            onClick={() => setTab(link.id)}
                            onMouseEnter={() => setHoveredTab(link.id)}
                            onMouseLeave={() => setHoveredTab(null)}
                            className={cn(
                                "relative flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 outline-none overflow-hidden",
                                isCollapsed ? "h-12 w-12 justify-center p-0" : "w-full"
                            )}
                        >
                            {/* Hover 'Spotlight' Effect */}
                            {hoveredTab === link.id && !isActive && (
                                <motion.div
                                    layoutId="hover-spotlight"
                                    className="absolute inset-0 bg-white/5 z-0 rounded-2xl"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                />
                            )}


                            {isActive && (
                                <motion.div
                                    layoutId="active-tab-bg"
                                    className="absolute inset-0 bg-white z-0 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                >

                                    <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", link.color)} />
                                </motion.div>
                            )}


                            <div className="relative z-10 flex items-center gap-3">
                                <div className={cn(
                                    "flex items-center justify-center rounded-lg p-1 transition-all duration-300",
                                    isActive ? "bg-transparent text-black" : "text-zinc-400 group-hover:text-zinc-100"
                                )}>
                                    <link.icon
                                        size={20}
                                        className={cn(
                                            "transition-transform duration-300",
                                            isActive && "scale-110"
                                        )}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                </div>

                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className={cn(
                                            "font-semibold text-sm tracking-wide transition-colors",
                                            isActive ? "text-black" : "text-zinc-400"
                                        )}
                                    >
                                        {link.title}
                                    </motion.span>
                                )}
                            </div>

                            {/* Badge Layer */}
                            {!isCollapsed && (
                                <div className={cn(
                                    "relative z-10 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all duration-300 shadow-sm border",
                                    isActive
                                        ? "bg-black/10 border-black/20 text-black"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                                )}>
                                    {link.label}
                                </div>
                            )}
                        </button>
                    )
                })}
            </nav>
        </div>
    )
}

export default SideBar