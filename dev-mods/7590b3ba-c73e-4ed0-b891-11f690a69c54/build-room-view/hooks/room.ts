import type { AgentLine, Question, Run, Ticket } from '../types'

// the session's sub-agents that are still doing something, or failed
export const activeAgents = (list: AgentLine[]): AgentLine[] =>
  list.filter(a => a.status !== 'completed' && a.status !== 'killed')

export type Column = { id: string; name: string; states: string[] }

const column = (id: string, name: string, states: string[]): Column => ({ id, name, states })
const SHAPING = column('shaping', 'Shaping', [])
const QUEUED = column('queued', 'Queued', ['NOT STARTED'])
// FACTORY: the cloud factory builds, gates and merges it (sf's build-route)
const BUILDING = column('building', 'Building', ['BUILDING', 'LOCAL', 'PROBE', 'FACTORY'])
const CI = column('ci', 'CI and bots', ['PUSHED', 'DRAFT PR', 'PR'])
const CALL = column('call', 'Your call', ['WAITING ON JOEY', 'COMPLEXITY REVIEW', 'DONE'])
const MERGED = column('merged', 'Merged', ['MERGED'])

export const COLUMNS: Column[] = [SHAPING, QUEUED, BUILDING, CI, CALL, MERGED]
// stacked layout: what needs a person comes first
export const STACKED: Column[] = [CALL, BUILDING, CI, QUEUED, SHAPING, MERGED]
export const SHOW_MERGED = 3
export const STACK_BELOW = 108

export const columnOf = (t: Ticket): Column =>
  COLUMNS.find(c => t.queue && [c.id, c.name.toLowerCase()].includes(String(t.queue).toLowerCase())) ??
  COLUMNS.find(c => c.states.includes(t.state)) ??
  QUEUED

export const isNarrow = (columns: number): boolean => columns < STACK_BELOW

const GATES = ['framed', 'requirements', 'grilled', 'impact', 'steward', 'split', 'spec', 'planReview', 'gate', 'ci', 'complexity']
const DONE = /^(true|done|passed|pass|ok|signed|green|release|released|yes|plan ok)\b/i
const SKIP = /^(none|n\/a|skip|skipped)$/i

export const gateCount = (t: Ticket): { done: number; total: number } => {
  const gates = t.gates ?? {}
  const done = GATES.filter(g => {
    const v = gates[g]
    return v === true || (typeof v === 'string' && (DONE.test(v) || SKIP.test(v)))
  }).length

  return { done, total: GATES.length }
}

export const isWaiting = (t: Ticket, open: Question[]): boolean =>
  t.state === 'WAITING ON JOEY' || open.some(q => q.ticket === t.id)

export const ticketMeta = (t: Ticket): string => {
  const g = gateCount(t)

  return [
    t.state,
    t.pr ? `#${t.pr}` : '',
    t.session ?? '',
    [t.model, t.effort].filter(Boolean).join(' '),
    `gates ${g.done}/${g.total}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

// the newest few merged tickets; the rest are counted
export const visible = (col: Column, items: Ticket[]): { shown: Ticket[]; hidden: number } =>
  col.id === 'merged' && items.length > SHOW_MERGED
    ? { shown: items.slice(-SHOW_MERGED), hidden: items.length - SHOW_MERGED }
    : { shown: items, hidden: 0 }

const isTicket = (v: unknown): v is Ticket =>
  typeof v === 'object' && v !== null && typeof (v as Ticket).id === 'string' && typeof (v as Ticket).state === 'string'

export const parseTickets = (text: string): { slug: string; orchestrator: string; tickets: Ticket[] } => {
  const j = JSON.parse(text) as Record<string, unknown>
  const list = Array.isArray(j.tickets) ? j.tickets : []

  return {
    slug: String(j.slug ?? ''),
    orchestrator: String(j.orchestrator ?? ''),
    tickets: list.filter(isTicket).map(t => ({ ...t, title: typeof t.title === 'string' ? t.title : t.id })),
  }
}

type Ev = { id: number; ticket: string; type: string; note: string; ask?: unknown }

export const parseEvents = (text: string): Ev[] =>
  text.split('\n').flatMap(line => {
    if (!line.trim()) return []
    try {
      const j = JSON.parse(line) as Partial<Ev>

      return typeof j.id === 'number' && typeof j.type === 'string'
        ? [{ id: j.id, ticket: String(j.ticket ?? ''), type: j.type, note: String(j.note ?? ''), ask: j.ask }]
        : []
    } catch {
      return []
    }
  })

const toAsk = (v: unknown): Question['ask'] | undefined => {
  if (typeof v !== 'object' || v === null) return undefined
  const a = v as Record<string, unknown>
  if (typeof a.question !== 'string') return undefined
  const options = Array.isArray(a.options)
    ? a.options.flatMap(o => {
        const r = o as Record<string, unknown> | null

        return r && typeof r.label === 'string'
          ? [{ label: r.label, description: typeof r.description === 'string' ? r.description : '' }]
          : []
      })
    : []

  return {
    header: typeof a.header === 'string' ? a.header : '',
    question: a.question,
    options,
    multiSelect: a.multiSelect === true,
  }
}

// a question is answered by an `answer` event whose note starts "re <its id>:"
export const openQuestions = (events: Ev[]): Question[] => {
  const answered = new Set<number>()
  for (const e of events) {
    const m = e.type === 'answer' ? /^re (\d+):/.exec(e.note) : null
    if (m?.[1]) answered.add(Number(m[1]))
  }

  return events.flatMap(e => {
    const ask = e.type === 'question' ? toAsk(e.ask) : undefined

    return ask && !answered.has(e.id) ? [{ id: e.id, ticket: e.ticket, ask }] : []
  })
}

export type Candidate = { dir: string; slug: string; orchestrator: string; mtimeMs: number }

// A run named in a prompt or command wins, then the run whose orchestrator is this session, then the newest.
export const pickRun = (
  list: Candidate[],
  title: string,
  named: string,
): { candidate: Candidate; how: Run['how'] } | undefined => {
  const byTime = [...list].sort((a, b) => b.mtimeMs - a.mtimeMs)
  const n = named.trim()
  const hit = n ? byTime.find(c => c.slug === n || c.dir === n || c.dir.endsWith(`/${n}`)) : undefined
  if (hit) return { candidate: hit, how: 'named' }
  const mine = title ? byTime.find(c => c.orchestrator === title) : undefined
  if (mine) return { candidate: mine, how: 'matched' }
  const first = byTime[0]

  return first ? { candidate: first, how: 'newest' } : undefined
}

// the run slug from a path or prompt that mentions ~/FyxerGh/build-room/<slug>
export const namedRun = (text: string): string | undefined =>
  text.match(/build-room\/([\w.-]+)/g)?.at(-1)?.split('/')[1]
