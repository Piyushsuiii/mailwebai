import React, { type ComponentProps } from "react"
import DOMPurify from 'dompurify';
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from "date-fns"
import { Sparkles, X } from 'lucide-react'

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useThread } from "@/app/mail/use-thread"
import { api, type RouterOutputs } from "@/trpc/react"
import { useAtom } from "jotai"
import useVim from "./kbar/use-vim"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { useLocalStorage } from "usehooks-ts"
import useThreads from "../use-threads"
import { useAISearch } from "../use-ai-search"
import { isSearchingAtom } from "./search-bar"

import { format } from "date-fns";

export function ThreadList() {
  const { threads, isFetching, accountId } = useThreads();
  const [aiSearch, setAISearch] = useAISearch();

  const [threadId, setThreadId] = useThread();
  const [parent] = useAutoAnimate(/* optional config */);
  const { selectedThreadIds, visualMode } = useVim();

  const markAsRead = api.mail.markThreadAsRead.useMutation()

  // Filter threads when AI search is active
  const displayThreads = aiSearch
    ? threads?.filter(t => aiSearch.threadIds.includes(t.id))
    : threads;

  const groupedThreads = displayThreads?.reduce((acc, thread) => {
    const date = format(thread.lastMessageDate ?? new Date(), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(thread);
    return acc;
  }, {} as Record<string, typeof displayThreads>);

  return (
    <div className="max-w-full overflow-y-auto scrollbar-hide max-h-[calc(100vh-120px)]">
      <div className="flex flex-col gap-2 p-4 pt-0" ref={parent}>
        {/* AI Filter Banner */}
        {aiSearch && (
          <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="text-xs text-indigo-300 truncate flex-1">
              {aiSearch.query}
            </span>
            <button
              onClick={() => setAISearch(null)}
              className="p-0.5 rounded hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors"
              title="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {Object.entries(groupedThreads ?? {}).map(([date, threads]) => (
          <React.Fragment key={date}>
            <div className="text-xs font-medium text-muted-foreground mt-4 first:mt-0">
              {format(new Date(date), "MMMM d, yyyy")}
            </div>
            {threads.map((item) => (
              <button
                id={`thread-${item.id}`}
                key={item.id}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all relative",
                  visualMode &&
                  selectedThreadIds.includes(item.id) &&
                  "bg-blue-900"
                )}
                onClick={() => {
                  setThreadId(item.id);
                  // Mark thread as read
                  if (accountId && item.emails.some(e => e.sysLabels.includes('unread'))) {
                    markAsRead.mutate({ accountId, threadId: item.id })
                  }
                }}
              >
                {threadId === item.id && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 z-[-1] rounded-lg"
                    layoutId="thread-list-item"
                    transition={{
                      duration: 0.1,
                      ease: "easeInOut",
                    }}
                  />
                )}
                <div className="flex flex-col w-full gap-1">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">
                        {item.emails.at(-1)?.from?.name}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "ml-auto text-xs",
                        threadId === item.id
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatDistanceToNow(item.emails.at(-1)?.sentAt ?? new Date(), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                  <div className="text-xs font-medium">{item.subject}</div>
                </div>
                <div
                  className="text-xs line-clamp-2 text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(item.emails.at(-1)?.bodySnippet ?? "", {
                      USE_PROFILES: { html: true },
                    }),
                  }}
                ></div>
                {item.emails[0]?.sysLabels.length ? (
                  <div className="flex items-center gap-2">
                    {item.emails.at(0)?.sysLabels.map((label) => (
                      <Badge
                        key={label}
                        variant={getBadgeVariantFromLabel(label)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function getBadgeVariantFromLabel(
  label: string
): ComponentProps<typeof Badge>["variant"] {
  if (["work"].includes(label.toLowerCase())) {
    return "default";
  }

  if (["personal"].includes(label.toLowerCase())) {
    return "outline";
  }

  return "secondary";
}
