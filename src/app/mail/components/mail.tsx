"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AccountSwitcher } from "@/app/mail/components/account-switcher"
import { ThreadDisplay } from "./thread-display"
import { ThreadList } from "./thread-list"
import { useLocalStorage } from "usehooks-ts"
import SideBar from "./sidebar"
import SearchBar, { isSearchingAtom } from "./search-bar"
import { useAtom } from "jotai"
import AskAI from "./ask-ai"
import useMailSync from "../use-mail-sync"
import { useThread } from "../use-thread"
import { useAISearch } from "../use-ai-search"
import AISearchDisplay from "./ai-search-display"
import SearchDisplay from "./search-display"
import { signOut } from "@/lib/auth-actions"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/theme-toggle"
import ComposeButton from "./compose-button"
import WebhookDebugger from "./webhook-debugger"
import FilterBar from "./filter-bar"

interface MailProps {
  defaultLayout: number[] | undefined
  defaultCollapsed?: boolean
  navCollapsedSize: number
}

export function Mail({
  defaultLayout = [20, 80],
  defaultCollapsed = false,
  navCollapsedSize,
}: MailProps) {
  const [done, setDone] = useLocalStorage('normalhuman-done', false)
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [threadId] = useThread()
  const [isSearching] = useAtom(isSearchingAtom)
  const [aiSearch] = useAISearch()
  useMailSync()

  // Determine which view to show in the content panel
  // Thread view takes priority so viewing an email isn't interrupted by stale AI search state
  const showThread = !!threadId
  const showAISearch = !showThread && !!aiSearch
  const showSearch = !showThread && !showAISearch && isSearching
  const showInbox = !showThread && !showAISearch && !showSearch

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout:mail=${JSON.stringify(
            sizes
          )}`
        }}
        className="items-stretch h-full min-h-screen"
      >

        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          {showAISearch ? (
            <AISearchDisplay />
          ) : showSearch ? (
            <SearchDisplay />
          ) : showThread ? (
            <ThreadDisplay />
          ) : (
            <Tabs defaultValue="inbox" value={done ? 'done' : 'inbox'} onValueChange={tab => {
              if (tab === 'done') {
                setDone(true)
              } else {
                setDone(false)
              }
            }}>
              <div className="flex items-center px-4 py-2">
                <h1 className="text-xl font-bold">Inbox</h1>
                <TabsList className="ml-auto">
                  <TabsTrigger
                    value="inbox"
                    className="text-zinc-600 dark:text-zinc-200"
                  >
                    Inbox
                  </TabsTrigger>
                  <TabsTrigger
                    value="done"
                    className="text-zinc-600 dark:text-zinc-200"
                  >
                    Done
                  </TabsTrigger>
                </TabsList>
              </div>
              <Separator />
              <SearchBar />
              <FilterBar />
              <TabsContent value="inbox" className="m-0">
                <ThreadList />
              </TabsContent>
              <TabsContent value="done" className="m-0">
                <ThreadList />
              </TabsContent>
            </Tabs>
          )}
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={40}
          onCollapse={() => {
            setIsCollapsed(true)
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              true
            )}`
          }}
          onResize={() => {
            setIsCollapsed(false)
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              false
            )}`
          }}
          className={cn(
            isCollapsed &&
            "min-w-[50px] transition-all duration-300 ease-in-out"
          )}
        >
          <div className="flex flex-col h-full flex-1">
            <div
              className={cn(
                "flex h-[52px] items-center justify-center",
                isCollapsed ? "h-[52px]" : "px-2"
              )}
            >
              <AccountSwitcher isCollapsed={isCollapsed} />
            </div>
            <Separator />
            <SideBar isCollapsed={isCollapsed} />
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col">
              <AskAI isCollapsed={isCollapsed} />
            </div>
            <Separator />
            <div className={cn(
              "flex items-center gap-2 p-2",
              isCollapsed ? "flex-col" : "flex-row"
            )}>
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  Sign Out
                </Button>
              </form>
              {/* <ModeToggle /> */}
              {!isCollapsed && (
                <>
                  <ComposeButton />
                  {process.env.NODE_ENV === 'development' && (
                    <WebhookDebugger />
                  )}
                </>
              )}
            </div>
          </div>

        </ResizablePanel>

      </ResizablePanelGroup>
    </TooltipProvider>
  )
}
