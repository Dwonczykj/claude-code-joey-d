import type { AgentLine, PrEntry, Question, Run, Ticket, Train } from '../types'

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
const MERGED = column('merged', 'Merged or done', ['MERGED'])

// topic-room tasks (sf's room CLI): no gates or PR, and a DONE one is finished rather than waiting on a merge
const TASKS = new Set(['explore', 'investigate', 'plan', 'design', 'prototype', 'size', 'evaluate', 'measure'])
export const isTask = (t: Ticket): boolean => TASKS.has(t.kind ?? '')

export const COLUMNS: Column[] = [SHAPING, QUEUED, BUILDING, CI, CALL, MERGED]
// stacked layout: what needs a person comes first
export const STACKED: Column[] = [CALL, BUILDING, CI, QUEUED, SHAPING, MERGED]
export const SHOW_MERGED = 3
export const STACK_BELOW = 108

export const columnOf = (t: Ticket): Column =>
  (isTask(t) && t.state === 'DONE' ? MERGED : undefined) ??
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
    t.kind && t.kind !== 'slice' ? t.kind : '',
    t.state,
    t.pr ? `#${t.pr}` : '',
    t.session ?? '',
    [t.model, t.effort].filter(Boolean).join(' '),
    isTask(t) ? '' : `gates ${g.done}/${g.total}`,
    t.source ? 'read-only' : '',
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

// Features in first-seen order and tickets with none last, as the room CLI's board draws them. A room with
// no features is one group with feature null.
export const featureGroups = (tickets: Ticket[]): { feature: string | null; tickets: Ticket[] }[] => {
  const names = [...new Set(tickets.map(t => t.feature ?? null))]

  return [...names.filter((n): n is string => n !== null), ...(names.includes(null) ? [null] : [])].map(feature => ({
    feature,
    tickets: tickets.filter(t => (t.feature ?? null) === feature),
  }))
}

export const parseTickets = (text: string): { slug: string; orchestrator: string; tickets: Ticket[] } => {
  const j = JSON.parse(text) as Record<string, unknown>
  const list = Array.isArray(j.tickets) ? j.tickets : []

  return {
    slug: String(j.slug ?? ''),
    orchestrator: String(j.orchestrator ?? ''),
    tickets: list.filter(isTicket).map(t => ({ ...t, title: typeof t.title === 'string' ? t.title : t.id })),
  }
}

type Ev = { id: number; ticket: string; type: string; note: string; ask?: unknown; from?: unknown }

export const parseEvents = (text: string): Ev[] =>
  text.split('\n').flatMap(line => {
    if (!line.trim()) return []
    try {
      const j = JSON.parse(line) as Partial<Ev>

      return typeof j.id === 'number' && typeof j.type === 'string'
        ? [{ id: j.id, ticket: String(j.ticket ?? ''), type: j.type, note: String(j.note ?? ''), ask: j.ask, from: j.from }]
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
    body: Array.isArray(a.body) ? a.body.filter((l): l is string => typeof l === 'string') : [],
  }
}

// the session behind a card (room ask --from-name), by name
const fromName = (v: unknown): string | undefined => {
  const name = typeof v === 'object' && v !== null ? (v as Record<string, unknown>).name : undefined

  return typeof name === 'string' && name ? name : undefined
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

    const from = fromName(e.from)

    return ask && !answered.has(e.id) ? [{ id: e.id, ticket: e.ticket, ask, ...(from ? { from } : {}) }] : []
  })
}

export type Candidate = { dir: string; slug: string; orchestrator: string; mtimeMs: number; sessions?: string[] }

// A run named in a prompt or command wins, then the run whose orchestrator is this session, then the run with a
// ticket worked by this session, then the newest.
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
  const member = title ? byTime.find(c => c.sessions?.includes(title)) : undefined
  if (member) return { candidate: member, how: 'member' }
  const first = byTime[0]

  return first ? { candidate: first, how: 'newest' } : undefined
}

// the run slug from a path or prompt that mentions ~/FyxerGh/build-room/<slug>
export const namedRun = (text: string): string | undefined =>
  text.match(/build-room\/([\w.-]+)/g)?.at(-1)?.split('/')[1]

// a session belongs to a room when it orchestrates it or works one of its tickets: only those run `room prs`
export const belongs = (how: Run['how']): boolean => how === 'matched' || how === 'member'

export const PRS_EVERY_MS = 60_000

// `room prs` runs on a Claude event at most once a minute, and never while one is still running
export const shouldCheck = (s: { dirty: boolean; running: boolean; lastMs: number }, nowMs: number): boolean =>
  s.dirty && !s.running && nowMs - s.lastMs >= PRS_EVERY_MS

// a room copied before `room prs` existed rejects the subcommand; argparse says so on stderr
export const lacksPrs = (stderr: string): boolean => /invalid choice: '?prs'?/.test(stderr)

// the installed sf plugin's `room`, from ~/.claude/plugins/installed_plugins.json, for a room whose copy is too old
export const installedRoomCli = (installedJson: string): string | undefined => {
  try {
    const plugins = (JSON.parse(installedJson) as { plugins?: Record<string, { installPath?: unknown }[]> }).plugins ?? {}
    const key = Object.keys(plugins).find(k => k.startsWith('sf@'))
    const path = key ? plugins[key]?.[0]?.installPath : undefined
    return typeof path === 'string' && path ? `${path}/scripts/room` : undefined
  } catch {
    return undefined
  }
}

const isEntry = (v: unknown): v is PrEntry =>
  typeof v === 'object' && v !== null && typeof (v as PrEntry).number === 'number' && typeof (v as PrEntry).state === 'string'

// prs.json: the unmerged PRs in merge order, and a count of the merged ones
export const parsePrs = (text: string): Train => {
  const j = JSON.parse(text) as Record<string, unknown>
  const list = (Array.isArray(j.prs) ? j.prs : []).filter(isEntry)

  return {
    checkedAt: typeof j.checkedAt === 'string' ? j.checkedAt : null,
    error: typeof j.error === 'string' ? j.error : null,
    open: list.filter(e => e.state === 'OPEN').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    merged: list.filter(e => e.state === 'MERGED').length,
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// the Room UI's chips, as text
export const prChips = (e: PrEntry): string[] => {
  const ci = e.ci ?? { passed: 0, failed: 0, running: 0, failing: [] }
  const states = (e.reviews ?? []).map(r => r.state)
  const approved = states.filter(s => s === 'APPROVED').length
  const threads = (e.threads?.bots ?? 0) + (e.threads?.humans ?? 0)
  const total = ci.passed + ci.failed + ci.running

  return [
    ci.failed
      ? `CI failed: ${ci.failing.join(', ')}`
      : ci.running
        ? `CI running ${ci.running} of ${total}`
        : ci.passed
          ? 'CI green'
          : 'no CI',
    states.includes('CHANGES_REQUESTED') ? 'changes requested' : approved ? `approved by ${approved}` : 'no review',
    threads ? `${plural(threads, 'open thread')} (${e.threads.bots} bot)` : '0 open threads',
    e.mergeable === 'CONFLICTING' ? 'merge conflict' : '',
    e.behind ? `${e.behind} behind ${e.base}` : '',
    e.draft ? 'draft' : '',
    e.builtBy === 'factory' ? 'factory build' : '',
    e.readOnly ? 'read-only' : '',
    e.waitsOn?.length ? `waits on ${e.waitsOn.join(', ')}` : '',
    e.ready ? 'ready to merge' : '',
  ].filter(Boolean)
}

export const ago = (iso: string | null, nowMs: number): string => {
  const ms = iso ? nowMs - Date.parse(iso) : NaN
  if (!Number.isFinite(ms)) return 'never'
  const min = Math.max(0, Math.round(ms / 60_000))

  return min < 1 ? 'just now' : min < 60 ? `${min} min ago` : min < 1440 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} d ago`
}
