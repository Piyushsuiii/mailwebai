"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { useSetAtom } from "jotai";
import { isSearchingAtom } from "./search-bar";
import { useThread } from "../use-thread";
import useThreads from "../use-threads";
import { cn } from "@/lib/utils";

interface AIEmailDisplayProps {
    emails: {
        threadId: string;
        subject: string;
        from: string;
        date: string;
        snippet: string;
    }[];
    onEmailClick?: (threadId: string) => void;
}

const AIEmailDisplay = ({ emails, onEmailClick }: AIEmailDisplayProps) => {
    const { isFetching } = useThreads();
    const [, setThreadId] = useThread();
    const setIsSearching = useSetAtom(isSearchingAtom);

    const handleEmailClick = (threadId: string) => {
        setThreadId(threadId);
        setIsSearching(false);
        if (onEmailClick) onEmailClick(threadId);
    };

    if (emails.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 w-full">
            {emails.map((email) => (
                <div
                    key={email.threadId}
                    className="flex flex-col gap-2 p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                    onClick={() => handleEmailClick(email.threadId)}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-zinc-200 group-hover:text-indigo-400 transition-colors">
                                {email.from}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                                {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                            </span>
                        </div>
                    </div>

                    <div className="text-xs text-zinc-300 font-medium truncate">
                        {email.subject}
                    </div>

                    <div className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {email.snippet}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AIEmailDisplay;
