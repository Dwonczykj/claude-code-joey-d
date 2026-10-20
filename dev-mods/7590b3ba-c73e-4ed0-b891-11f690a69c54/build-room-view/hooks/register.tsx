import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentLine, Run, View } from '../types'
import {
  COLUMNS,
  STACKED,
  activeAgents,
  columnOf,
  featureGroups,
  isNarrow,
  isWaiting,
  namedRun,
  openQuestions,
  parseEvents,
  parseTickets,
  pickRun,
  ticketMeta,
  visible,
} from './room'
import type { Candidate } from './room'

const PANE = 'build-room-view'
const TITLE = 'Build Room'
const POLL_MS = 5000
const SHOW_QUESTIONS = 5
const SHOW_AGENTS = 5

const WAITING: View = { run: null, message: 'Looking for a Build Room run under ~/FyxerGh/build-room/...' }
const view = atom({ plugin: 'build-room-view', key: 'view' } as const, WAITING)
const sessionTitle = atom({ plugin: 'build-room-view', key: 'sessionTitle' } as const, '')
const named = atom({ plugin: 'build-room-view', key: 'named' } as const, '')
const agents = atom({ plugin: 'build-room-view', key: 'agents' } as const, [] as AgentLine[])

const HOW: Record<Run['how'], string> = {
  matched: "this session's run",
  named: 'the run you named',
  newest: 'the newest run, not matched to this session',
}

export const register: Register = on => {
  let seen = ''
  let isPlaced = false

  on('session.start', async ($, e, next) => {
    // Re-reads only when a file's mtime, the session's title or the named run moved. Never writes.
    const refresh = async () => {
      const home = await $.env.get('HOME')
      if (!home) return
      const base = `${home}/FyxerGh/build-room`
      const dirs = (await $.fs.exists(base)) ? (await $.fs.list(base)).filter(d => d.kind === 'dir') : []
      const stats = await Promise.all(
        dirs.map(async d => {
          const dir = `${base}/${d.name}`
          const t = await $.fs.stat(`${dir}/tickets.json`).catch(() => undefined)
          const ev = await $.fs.stat(`${dir}/events.jsonl`).catch(() => undefined)

          return { dir, tMs: t?.mtimeMs ?? 0, eMs: ev?.mtimeMs ?? 0 }
        }),
      )
      const title = await read($, sessionTitle)
      const want = await read($, named)
      const subs: AgentLine[] = (await $.agent.list().catch(() => [])).map(a => ({
        id: a.id,
        description: a.description,
        status: a.status,
      }))
      const key = JSON.stringify([stats, title, want, subs])
      if (key === seen) return
      await update($, agents, () => subs)

      try {
        const candidates = (
          await Promise.all(
            stats
              .filter(s => s.tMs > 0)
              .map(async (s): Promise<Candidate | undefined> => {
                const t = parseTickets(await $.fs.read(`${s.dir}/tickets.json`))

                return { dir: s.dir, slug: t.slug, orchestrator: t.orchestrator, mtimeMs: Math.max(s.tMs, s.eMs) }
              }),
          )
        ).filter((c): c is Candidate => c !== undefined)
        const pick = pickRun(candidates, title, want)
        if (!pick) {
          seen = key
          await update($, view, () => ({
            run: null,
            message: want
              ? `No run named "${want}" has a tickets.json under ~/FyxerGh/build-room/.`
              : 'No Build Room run found. The orchestrator writes tickets.json in ~/FyxerGh/build-room/<slug>/ when a build starts.',
          }))

          return
        }
        const { dir } = pick.candidate
        const t = parseTickets(await $.fs.read(`${dir}/tickets.json`))
        const events = await $.fs.read(`${dir}/events.jsonl`).catch(() => '')
        const run: Run = {
          dir,
          slug: t.slug || dir.split('/').at(-1) || dir,
          orchestrator: t.orchestrator,
          tickets: t.tickets,
          open: openQuestions(parseEvents(events)),
          how: pick.how,
          stale: '',
        }
        seen = key
        await update($, view, () => ({ run, message: '' }))
        // The orchestrator's own session gets the pane without asking; any other session uses the command.
        if (pick.how === 'matched' && !isPlaced) {
          const opened = await $.ui.open({ id: PANE, title: TITLE })
          isPlaced = opened.isPlaced
        }
      } catch (err) {
        // a half-written file: keep the last good picture on screen and say why it is stale
        const reason = err instanceof Error ? err.message : String(err)
        await update($, view, v => (v.run ? { ...v, run: { ...v.run, stale: `Stale: ${reason}` } } : v))
      }
    }

    await $.command.register({
      name: 'build-room-view',
      description: 'Show the Build Room inbox and board in a pane (optional: a run name)',
    })
    await refresh().catch(() => undefined)
    $.clock.every(POLL_MS, () => void refresh().catch(() => undefined))

    return next(e)
  })

  on('classic.UserPromptSubmit', async ($, e, next) => {
    const run = namedRun(e.prompt)
    // never hold up the prompt over a bookkeeping write
    await Promise.all([
      e.session_title ? update($, sessionTitle, () => e.session_title ?? '') : undefined,
      run ? update($, named, () => run) : undefined,
    ]).catch(() => undefined)

    return next(e)
  })

  on('command.run', { command: 'build-room-view' }, async ($, e) => {
    const slug = e.args.trim().split(/\s+/)[0] ?? ''
    if (slug) await update($, named, () => slug)
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: slug ? `Build Room pane opened on "${slug}".` : 'Build Room pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const { run, message } = await read($, view)
    // the pane's own body width, not the terminal's: a docked pane is much narrower than the screen
    const columns = e.props.bodyColumns > 0 ? e.props.bodyColumns : (e.viewport?.columns ?? 80)

    if (!run) {
      return (
        <Box flexDirection="column">
          <Text dimColor>{message}</Text>
        </Box>
      )
    }

    const { open } = run
    const working = activeAgents(await read($, agents))
    const block = (t: (typeof run.tickets)[number], isWide: boolean) => (
      <Box flexDirection="column">
        <Text color={isWaiting(t, open) ? 'warning' : 'text'} wrap="truncate-end">
          {t.id} {t.title}
        </Text>
        {(isWide || columns >= 60) && (
          <Text dimColor wrap="truncate-end">
            {ticketMeta(t)}
          </Text>
        )}
      </Box>
    )
    const hiddenNote = (hidden: number) => hidden > 0 && <Text dimColor>+{hidden} older merged</Text>

    const boardOf = (tickets: typeof run.tickets) =>
      isNarrow(columns) ? (
        <Box flexDirection="column">
          {STACKED.filter(c => tickets.some(t => columnOf(t) === c)).map(c => {
            const { shown, hidden } = visible(c, tickets.filter(t => columnOf(t) === c))

            return (
              <Box flexDirection="column" marginTop={1}>
                <Text bold wrap="truncate-end">
                  {c.name} {tickets.filter(t => columnOf(t) === c).length}
                </Text>
                {shown.map(t => block(t, false))}
                {hiddenNote(hidden)}
              </Box>
            )
          })}
          <Text dimColor wrap="truncate-end">
            Empty: {COLUMNS.filter(c => !tickets.some(t => columnOf(t) === c)).map(c => c.name).join(', ') || 'none'}
          </Text>
        </Box>
      ) : (
        <Box flexDirection="row">
          {COLUMNS.map(c => {
            const items = tickets.filter(t => columnOf(t) === c)
            const { shown, hidden } = visible(c, items)

            return (
              <Box flexDirection="column" width={`${Math.floor(100 / COLUMNS.length)}%`} paddingRight={1}>
                <Text bold wrap="truncate-end">
                  {c.name} {items.length}
                </Text>
                {items.length === 0 && <Text dimColor>-</Text>}
                {shown.map(t => block(t, true))}
                {hiddenNote(hidden)}
              </Box>
            )
          })}
        </Box>
      )
    // a topic room with features gets one board per feature; a room with its contract at the root keeps one
    const groups = featureGroups(run.tickets)
    const board =
      groups.length <= 1 && !groups[0]?.feature ? (
        boardOf(run.tickets)
      ) : (
        <Box flexDirection="column">
          {groups.map(g => (
            <Box flexDirection="column" marginTop={1}>
              <Text bold underline wrap="truncate-end">
                {g.feature ? `Feature ${g.feature}` : 'No feature: tasks and light builds'} · {g.tickets.length}
              </Text>
              {boardOf(g.tickets)}
            </Box>
          ))}
        </Box>
      )

    return (
      <Box flexDirection="column">
        <Text bold wrap="truncate-end">
          {run.slug} · {run.orchestrator || 'no orchestrator named'}
        </Text>
        <Text dimColor wrap="truncate-end">
          {run.tickets.length} tickets · {HOW[run.how]}
        </Text>
        {run.stale && <Text color="warning">{run.stale}</Text>}

        <Box flexDirection="column" marginTop={1}>
          <Text bold color={open.length ? 'warning' : 'success'}>
            Inbox · {open.length ? `${open.length} waiting on you` : 'nothing waiting'}
          </Text>
          {open.slice(0, SHOW_QUESTIONS).map(q => (
            <Box flexDirection="column" marginTop={1}>
              <Text bold color="warning" wrap="truncate-end">
                {q.ask.header || 'Question'} · {q.ticket}
              </Text>
              <Text>{q.ask.question}</Text>
              {q.ask.body.map(line => (
                <Text dimColor wrap="truncate-end">
                  {`  ${line}`}
                </Text>
              ))}
              {q.from && <Text dimColor>{`  from ${q.from}`}</Text>}
              {q.ask.options.map((o, i) => (
                <Text wrap="truncate-end">
                  {`  ${i + 1}. ${o.label}${o.description ? ` · ${o.description}` : ''}`}
                </Text>
              ))}
            </Box>
          ))}
          {open.length > SHOW_QUESTIONS && <Text dimColor>+{open.length - SHOW_QUESTIONS} more in the Build Room</Text>}
          {open.length > 0 && <Text dimColor>Answer in the Build Room page or the orchestrator session.</Text>}
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text bold>Board</Text>
          {board}
        </Box>

        {working.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Sub-agents · {working.length} active</Text>
            {working.slice(0, SHOW_AGENTS).map(a => (
              <Text color={a.status === 'failed' ? 'error' : 'text'} wrap="truncate-end">
                {a.status} · {a.description}
              </Text>
            ))}
            {working.length > SHOW_AGENTS && <Text dimColor>+{working.length - SHOW_AGENTS} more</Text>}
          </Box>
        )}
      </Box>
    )
  })
}
