'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, X, Search, Calendar, User, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMailFilter, type MailFilter } from '../use-mail-filter'

const FilterBar = () => {
    const [filter, setFilter] = useMailFilter()
    const [isOpen, setIsOpen] = useState(false)

    // Local draft state so user can fill fields before applying
    const [dateFrom, setDateFrom] = useState(filter?.dateFrom ?? '')
    const [dateTo, setDateTo] = useState(filter?.dateTo ?? '')
    const [sender, setSender] = useState(filter?.sender ?? '')
    const [keyword, setKeyword] = useState(filter?.keyword ?? '')
    const [readStatus, setReadStatus] = useState<'all' | 'read' | 'unread'>(filter?.readStatus ?? 'all')

    const hasActiveFilter = !!filter

    const applyFilter = () => {
        const newFilter: NonNullable<MailFilter> = {}
        if (dateFrom) newFilter.dateFrom = dateFrom
        if (dateTo) newFilter.dateTo = dateTo
        if (sender) newFilter.sender = sender
        if (keyword) newFilter.keyword = keyword
        if (readStatus !== 'all') newFilter.readStatus = readStatus

        // Only set if at least one filter is active
        if (Object.keys(newFilter).length > 0) {
            setFilter(newFilter)
        } else {
            setFilter(null)
        }
    }

    const clearFilter = () => {
        setDateFrom('')
        setDateTo('')
        setSender('')
        setKeyword('')
        setReadStatus('all')
        setFilter(null)
    }

    // Sync local state when filter atom changes externally (e.g. from AI)
    React.useEffect(() => {
        if (filter) {
            setDateFrom(filter.dateFrom ?? '')
            setDateTo(filter.dateTo ?? '')
            setSender(filter.sender ?? '')
            setKeyword(filter.keyword ?? '')
            setReadStatus(filter.readStatus ?? 'all')
            setIsOpen(true)
        }
    }, [filter])

    return (
        <div className="px-4 pt-2">
            {/* Toggle button */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                        hasActiveFilter
                            ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                            : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border border-transparent"
                    )}
                >
                    <Filter className="w-3.5 h-3.5" />
                    Filters
                    {hasActiveFilter && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                </button>
                {hasActiveFilter && (
                    <button
                        onClick={clearFilter}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Clear
                    </button>
                )}
            </div>

            {/* Expandable filter panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 gap-2 pt-3 pb-2">
                            {/* Date From */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all"
                                />
                            </div>

                            {/* Date To */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={e => setDateTo(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all"
                                />
                            </div>

                            {/* Sender */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    Sender
                                </label>
                                <input
                                    type="text"
                                    value={sender}
                                    onChange={e => setSender(e.target.value)}
                                    placeholder="Name or email..."
                                    className="w-full px-2 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all"
                                />
                            </div>

                            {/* Keyword */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                    <Search className="w-3 h-3" />
                                    Keyword
                                </label>
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={e => setKeyword(e.target.value)}
                                    placeholder="Search in emails..."
                                    className="w-full px-2 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all"
                                />
                            </div>

                            {/* Read Status */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    Status
                                </label>
                                <select
                                    value={readStatus}
                                    onChange={e => setReadStatus(e.target.value as 'all' | 'read' | 'unread')}
                                    className="w-full px-2 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="all">All</option>
                                    <option value="unread">Unread</option>
                                    <option value="read">Read</option>
                                </select>
                            </div>

                            {/* Apply button */}
                            <div className="flex items-end">
                                <button
                                    onClick={applyFilter}
                                    className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default FilterBar
