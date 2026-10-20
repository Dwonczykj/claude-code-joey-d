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
  how: 'named' | 'matched' | 'member' | 'newest'
  stale: string
  train: Train | null
}

// one PR in the room's prs.json, which sf's `room prs` alone writes from GitHub
export type PrEntry = {
  key: string
  number: number
  title: string
  state: string
  draft: boolean
  base: string
  ci: { passed: number; failed: number; running: number; failing: string[] }
  reviews: { login: string; state: string }[]
  threads: { bots: number; humans: number }
  mergeable: string
  behind: number | null
  builtBy: string
  readOnly: boolean
  order: number | null
  depth: number
  waitsOn: string[]
  next: boolean
  ready: boolean
}

// the unmerged PRs in merge order, when GitHub was last read, and why the last read failed
export type Train = { checkedAt: string | null; error: string | null; open: PrEntry[]; merged: number }

export type View = { run: Run | null; message: string }

export type AgentLine = { id: string; description: string; status: string }

declare module 'claude-code' {
  interface PluginState {
    'build-room-view': { view: View; sessionTitle: string; named: string; agents: AgentLine[]; prsRun: string }
  }
}
