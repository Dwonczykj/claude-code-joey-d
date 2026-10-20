export type Ticket = {
  id: string
  title: string
  state: string
  queue?: string
  pr?: number | null
  session?: string
  model?: string
  effort?: string
  gates?: Record<string, unknown>
  kind?: string
  feature?: string
  source?: string
}

export type Question = {
  id: number
  ticket: string
  ask: {
    header: string
    question: string
    options: { label: string; description: string }[]
    multiSelect: boolean
    body: string[]
  }
  from?: string
}

export type Run = {
  dir: string
  slug: string
  orchestrator: string
  tickets: Ticket[]
  open: Question[]
  how: 'named' | 'matched' | 'newest'
  stale: string
}

export type View = { run: Run | null; message: string }

export type AgentLine = { id: string; description: string; status: string }

declare module 'claude-code' {
  interface PluginState {
    'build-room-view': { view: View; sessionTitle: string; named: string; agents: AgentLine[] }
  }
}
