import { expect, test } from 'claude-code/testing'

import type { Ticket } from '../types'
import {
  activeAgents,
  ago,
  belongs,
  installedRoomCli,
  columnOf,
  featureGroups,
  gateCount,
  isNarrow,
  lacksPrs,
  namedRun,
  openQuestions,
  parseEvents,
  parsePrs,
  parseTickets,
  pickRun,
  prChips,
  shouldCheck,
  ticketMeta,
  visible,
  COLUMNS,
} from './room'

const t = (over: Partial<Ticket>): Ticket => ({ id: 's1', title: 'A slice', state: 'BUILDING', ...over })

test('a ticket lands in the column of its queue, else of its state, else Queued', () => {
  expect(columnOf(t({ queue: 'shaping' })).id).toBe('shaping')
  expect(columnOf(t({ queue: 'CI and bots' })).id).toBe('ci')
  expect(columnOf(t({ state: 'PR' })).id).toBe('ci')
  expect(columnOf(t({ state: 'WAITING ON JOEY' })).id).toBe('call')
  expect(columnOf(t({ state: 'FACTORY' })).id).toBe('building')
  expect(columnOf(t({ state: 'SOMETHING NEW' })).id).toBe('queued')
  // a finished topic-room task is done, not waiting on your call
  expect(columnOf(t({ kind: 'explore', state: 'DONE' })).id).toBe('merged')
  expect(columnOf(t({ kind: 'slice', state: 'DONE' })).id).toBe('call')
})

test('a topic room groups by feature, tickets with none last; a room with none is one group', () => {
  const list = [t({ id: 'x1', kind: 'explore' }), t({ id: 'b1', feature: 'search' }), t({ id: 'w1', feature: 'export' }), t({ id: 'b2', feature: 'search' })]
  expect(featureGroups(list).map(g => [g.feature, g.tickets.map(x => x.id)])).toEqual([
    ['search', ['b1', 'b2']],
    ['export', ['w1']],
    [null, ['x1']],
  ])
  expect(featureGroups([t({ id: 'a' }), t({ id: 'b' })]).map(g => g.feature)).toEqual([null])
})

test('meta names a task kind instead of gates, and marks an adopted ticket read-only', () => {
  expect(ticketMeta(t({ kind: 'design', session: 'g1' }))).toBe('design · BUILDING · g1')
  expect(ticketMeta(t({ kind: 'light', source: '/runs/other' }))).toBe('light · BUILDING · gates 0/11 · read-only')
})

test('gates count done, passed and skipped values out of eleven', () => {
  const g = gateCount(t({ gates: { framed: true, grilled: 'done', spec: 'none', gate: 'RELEASE round 3', ci: 'red', impact: false } }))
  expect(g).toEqual({ done: 4, total: 11 })
  expect(gateCount(t({}))).toEqual({ done: 0, total: 11 })
})

test('meta names state, PR, session, model and gates', () => {
  expect(ticketMeta(t({ pr: 15082, session: 'call-summary', model: 'Opus 5.5', effort: 'high' }))).toBe(
    'BUILDING · #15082 · call-summary · Opus 5.5 high · gates 0/11',
  )
})

test('tickets.json parses, drops entries without an id and state, and defaults a title', () => {
  const run = parseTickets(JSON.stringify({ slug: 'x', orchestrator: 'o', tickets: [{ id: 'a', state: 'PR' }, { id: 'b' }, 7] }))
  expect(run.slug).toBe('x')
  expect(run.tickets).toEqual([{ id: 'a', state: 'PR', title: 'a' }])
  expect(() => parseTickets('{ half')).toThrow()
})

const q = (id: number, ticket: string) =>
  JSON.stringify({ ts: 'x', id, ticket, role: 'orchestrator', type: 'question', note: 'q', ask: { header: 'H', question: `Q${id}?`, options: [{ label: 'Yes', description: 'go' }, { label: 'No' }], multiSelect: false } })

test('a question stays open until an answer event says "re <id>:"', () => {
  const log = [
    q(1, 's1'),
    q(2, 's2'),
    JSON.stringify({ id: 3, ticket: 's1', type: 'answer', note: 're 1: Yes' }),
    JSON.stringify({ id: 4, ticket: 's3', type: 'question', note: 'plain question with no card' }),
    'not json',
    '',
  ].join('\n')
  const open = openQuestions(parseEvents(log))
  expect(open.map(x => x.id)).toEqual([2])
  expect(open[0]?.ask.options).toEqual([{ label: 'Yes', description: 'go' }, { label: 'No', description: '' }])
  expect(open[0]?.ask.body).toEqual([])
  expect(open[0]?.from).toBeUndefined()
})

test('a card carries its body lines and the session behind it', () => {
  const card = JSON.stringify({ id: 7, ticket: 'l1', type: 'question', note: 'q', from: { name: 'copy-chat', sessionId: 'local_x' },
    ask: { header: 'Light build', question: 'Sign it?', options: [{ label: 'Sign it' }], multiSelect: false, body: ['1. Say X.', 2, '2. Say Y.'] } })
  const [q7] = openQuestions(parseEvents(card))
  expect(q7?.ask.body).toEqual(['1. Say X.', '2. Say Y.'])
  expect(q7?.from).toBe('copy-chat')
})

const cand = (dir: string, orchestrator: string, mtimeMs: number) => ({ dir, slug: dir.split('/').at(-1) ?? '', orchestrator, mtimeMs })

test('a named run wins, then this session\'s orchestrator, then the newest', () => {
  const list = [cand('/b/old', 'coord-1', 1), cand('/b/new', 'coord-2', 5), cand('/b/demo', 'demo', 9)]
  expect(pickRun(list, 'coord-1', 'new')?.candidate.dir).toBe('/b/new')
  expect(pickRun(list, 'coord-1', 'new')?.how).toBe('named')
  expect(pickRun(list, 'coord-1', '')?.candidate.dir).toBe('/b/old')
  expect(pickRun(list, 'coord-1', '')?.how).toBe('matched')
  expect(pickRun(list, 'nobody', '')?.candidate.dir).toBe('/b/demo')
  expect(pickRun(list, 'nobody', '')?.how).toBe('newest')
  expect(pickRun([], 'x', '')).toBeUndefined()
})

test('a run is named by the last build-room path in a prompt', () => {
  expect(namedRun('look at ~/FyxerGh/build-room/demo-export/ledger.md and /x/build-room/other')).toBe('other')
  expect(namedRun('nothing here')).toBeUndefined()
})

test('only sub-agents still working, waiting or failed are listed', () => {
  const a = (id: string, status: string) => ({ id, description: id, status })
  expect(activeAgents([a('a', 'running'), a('b', 'completed'), a('c', 'failed'), a('d', 'killed'), a('e', 'idle')]).map(x => x.id)).toEqual(['a', 'c', 'e'])
})

test('the stacked layout starts below 108 columns, and only the newest three merged tickets show', () => {
  expect(isNarrow(107)).toBe(true)
  expect(isNarrow(108)).toBe(false)
  const merged = COLUMNS.find(c => c.id === 'merged')!
  const five = [1, 2, 3, 4, 5].map(n => t({ id: `m${n}`, state: 'MERGED' }))
  expect(visible(merged, five).shown.map(x => x.id)).toEqual(['m3', 'm4', 'm5'])
  expect(visible(merged, five).hidden).toBe(2)
  expect(visible(COLUMNS[0]!, five).hidden).toBe(0)
})

test('a session working one of a run\'s tickets belongs to that run, after a named run and the orchestrator\'s', () => {
  const list = [{ ...cand('/b/a', 'orch-a', 1), sessions: ['worker-a'] }, cand('/b/b', 'orch-b', 9)]
  expect(pickRun(list, 'worker-a', '')).toEqual({ candidate: list[0], how: 'member' })
  expect(pickRun(list, 'orch-b', '')?.how).toBe('matched')
  expect(belongs('member') && belongs('matched')).toBe(true)
  expect(belongs('newest') || belongs('named')).toBe(false)
})

test('room prs runs on an event at most once a minute, never two at once', () => {
  expect(shouldCheck({ dirty: true, running: false, lastMs: 0 }, 60_000)).toBe(true)
  expect(shouldCheck({ dirty: true, running: false, lastMs: 10_000 }, 60_000)).toBe(false)
  expect(shouldCheck({ dirty: false, running: false, lastMs: 0 }, 600_000)).toBe(false)
  expect(shouldCheck({ dirty: true, running: true, lastMs: 0 }, 600_000)).toBe(false)
})

test('an old room copy falls back to the installed plugin room CLI', () => {
  expect(lacksPrs("room: error: argument cmd: invalid choice: 'prs' (choose from 'log', 'ask')")).toBe(true)
  expect(lacksPrs('gh: not logged in')).toBe(false)
  const installed = JSON.stringify({ plugins: { 'other@x': [{ installPath: '/o' }], 'sf@sf': [{ installPath: '/cache/sf/0.7.32' }] } })
  expect(installedRoomCli(installed)).toBe('/cache/sf/0.7.32/scripts/room')
  expect(installedRoomCli('{"plugins":{}}')).toBe(undefined)
  expect(installedRoomCli('not json')).toBe(undefined)
})

const pr = (over: Record<string, unknown>) => ({
  key: 'o/r#1', number: 1, title: 'One', state: 'OPEN', draft: false, base: 'staging',
  ci: { passed: 3, failed: 0, running: 0, failing: [] }, reviews: [], threads: { bots: 0, humans: 0 },
  mergeable: 'MERGEABLE', behind: 0, builtBy: 'session', readOnly: false, order: 1, depth: 0, waitsOn: [], next: false,
  ready: false, ...over,
})

test('prs.json gives the unmerged PRs in merge order and counts the merged ones', () => {
  const train = parsePrs(JSON.stringify({ checkedAt: '2026-10-20T10:00:00Z', error: null, prs: [
    pr({ number: 3, order: 2 }), pr({ number: 2, order: 1, next: true }), pr({ number: 9, state: 'MERGED', order: null }),
    pr({ number: 8, state: 'CLOSED', order: null }), { junk: true },
  ] }))
  expect(train.open.map(e => e.number)).toEqual([2, 3])
  expect(train.merged).toBe(1)
  expect(train.checkedAt).toBe('2026-10-20T10:00:00Z')
  expect(train.error).toBeNull()
  expect(() => parsePrs('{ half')).toThrow()
})

test('a PR\'s chips say CI, reviews, threads, conflicts, behind and ready', () => {
  expect(prChips(pr({ reviews: [{ login: 'a', state: 'APPROVED' }], ready: true }))).toEqual([
    'CI green', 'approved by 1', '0 open threads', 'ready to merge',
  ])
  expect(prChips(pr({
    ci: { passed: 1, failed: 1, running: 1, failing: ['unit'] }, threads: { bots: 2, humans: 1 }, mergeable: 'CONFLICTING',
    behind: 12, draft: true, builtBy: 'factory', readOnly: true, waitsOn: ['t9'],
    reviews: [{ login: 'a', state: 'APPROVED' }, { login: 'b', state: 'CHANGES_REQUESTED' }],
  }))).toEqual([
    'CI failed: unit', 'changes requested', '3 open threads (2 bot)', 'merge conflict', '12 behind staging', 'draft',
    'factory build', 'read-only', 'waits on t9',
  ])
  expect(prChips(pr({ ci: { passed: 3, failed: 0, running: 38, failing: [] } }))[0]).toBe('CI running 38 of 41')
})

test('checkedAt reads as a time ago', () => {
  const now = Date.parse('2026-10-20T12:00:00Z')
  expect(ago('2026-10-20T11:58:00Z', now)).toBe('2 min ago')
  expect(ago('2026-10-20T11:59:50Z', now)).toBe('just now')
  expect(ago('2026-10-20T09:00:00Z', now)).toBe('3 h ago')
  expect(ago(null, now)).toBe('never')
})
