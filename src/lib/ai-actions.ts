// AI Action types — structured payloads the AI dispatches to control the UI

export type ComposeEmailAction = {
    type: 'compose_email'
    to: string[]
    cc?: string[]
    subject: string
    body: string
    autoSend?: boolean
}

export type NavigateAction = {
    type: 'navigate'
    tab: 'inbox' | 'sent' | 'drafts' | 'done'
}

export type SearchEmailsAction = {
    type: 'search_emails'
    query: string
}

export type AISearchResultsAction = {
    type: 'ai_search_results'
    query: string
    threadIds: string[]
}

export type OpenEmailAction = {
    type: 'open_email'
    threadId: string
}

export type AIAction = ComposeEmailAction | NavigateAction | SearchEmailsAction | AISearchResultsAction | OpenEmailAction
