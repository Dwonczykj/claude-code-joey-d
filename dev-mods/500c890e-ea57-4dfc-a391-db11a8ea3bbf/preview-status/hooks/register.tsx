import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { DeployState, JobState, Row, View } from '../types'
import { fetchRows, fmtShort, fmtTime, ticketOf } from './previews'

const PANE = 'previews'
const EVERY_MS = 60_000
const BAR = 20
const view = atom({ plugin: 'preview-status', key: 'view' } as const, {
  mode: 'all',
  ticket: null,
  rows: [],
  updatedAt: null,
  error: null,
  isLoading: false,
} as View)

const LOOK: Record<DeployState | JobState, { color: string; icon: string }> = {
  Succeeded: { color: 'success', icon: '✓' },
  succeeded: { color: 'success', icon: '✓' },
  Failed: { color: 'error', icon: '✗' },
  failed: { color: 'error', icon: '✗' },
  Running: { color: 'warning', icon: '…' },
  running: { color: 'warning', icon: '…' },
  Queued: { color: 'subtle', icon: '·' },
  queued: { color: 'subtle', icon: '·' },
  Cancelled: { color: 'subtle', icon: '–' },
  cancelled: { color: 'subtle', icon: '–' },
}

let isBusy = false

const refresh = async ($: EngineInterface) => {
  if (isBusy) return
  isBusy = true
  await update($, view, v => ({ ...v, isLoading: true }))
  try {
    const { mode, ticket } = await read($, view)
    const rows = await fetchRows(argv => $.process.run(argv, { timeoutMs: 60_000 }), mode === 'ticket' ? ticket : null)
    const updatedAt = await $.clock.now()
    await update($, view, v => ({ ...v, rows, updatedAt, error: null }))
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await update($, view, v => ({ ...v, error }))
  } finally {
    await update($, view, v => ({ ...v, isLoading: false }))
    isBusy = false
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'previews',
      description: "Deploy-preview pane: /previews [all | PRE-1234]; default is this branch's ticket",
    })
    $.clock.every(EVERY_MS, async () => {
      const isOpen = (await $.ui.panes()).some(pane => pane.id === PANE)
      if (isOpen) void refresh($)
    })

    return next(e)
  })

  on('command.run', { command: 'previews' }, async ($, e) => {
    const arg = e.args.trim()
    let ticket = ticketOf(arg)
    if (!ticket && arg !== 'all') {
      const branch = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
      ticket = ticketOf(branch.stdout)
    }
    await update($, view, v => ({ ...v, mode: ticket ? 'ticket' : 'all', ticket }))
    const opened = await $.ui.open({ id: PANE, title: 'Previews' })
    void refresh($)

    return { text: opened.isPlaced ? `Previews pane open (${ticket ?? 'all deploy:preview PRs'}).` : 'No room for the pane; widen the terminal.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Link } = $.ui.resolve(e)
    const v = await read($, view)
    const room = Math.max(1, (e.viewport?.rows ?? 60) - 6)
    const scope = v.mode === 'ticket' ? `${v.ticket}` : 'all deploy:preview PRs'

    const chip = (look: { color: string; icon: string }, label: string) => (
      <Text backgroundColor={look.color} color="inverseText" bold>
        {` ${look.icon} ${label} `}
      </Text>
    )

    const card = (row: Row) => {
      const state = row.deploy?.state
      const look = state ? LOOK[state] : LOOK.Queued
      const jobs = row.deploy?.jobs ?? []
      const done = jobs.filter(j => j.state === 'succeeded').length
      const filled = jobs.length ? Math.round((done / jobs.length) * BAR) : 0
      const barColor = state === 'Failed' ? 'error' : state === 'Succeeded' ? 'success' : 'warning'
      return (
        <Box flexDirection="column" borderStyle="round" borderColor={look.color} paddingX={1} marginTop={1}>
          <Box flexDirection="row" gap={1}>
            {state ? chip(look, state.toUpperCase()) : chip(LOOK.Queued, 'NO RUN YET')}
            {row.deploy?.isStale && chip(LOOK.Running, 'STALE')}
            {row.red.length > 0 ? chip(LOOK.Failed, `CI ${row.red.length} red`) : chip(LOOK.Succeeded, 'CI green')}
            {row.pending > 0 && chip(LOOK.Running, `${row.pending} pending`)}
          </Box>
          <Link href={row.url} label={`#${row.number} ${row.title}`} />
          <Text dimColor wrap="truncate-end">
            {row.branch} · last commit {row.lastCommit ? fmtTime(row.lastCommit) : 'unknown'}
          </Text>
          {row.red.length > 0 && <Text color="error">Red: {row.red.join(', ')}</Text>}
          {row.error && <Text color="error">Error: {row.error}</Text>}
          {row.deploy?.isStale && <Text color="warning">Run is for an older commit than the PR head.</Text>}
          {jobs.length > 0 && (
            <Box flexDirection="row" marginTop={1}>
              <Text color={barColor}>{'█'.repeat(filled)}</Text>
              <Text color="subtle">{'░'.repeat(BAR - filled)}</Text>
              <Text dimColor>{` ${done}/${jobs.length} jobs`}</Text>
            </Box>
          )}
          {jobs.map(job => (
            <Box flexDirection="column">
              <Box flexDirection="row" gap={1}>
                <Text color={LOOK[job.state].color}>{LOOK[job.state].icon}</Text>
                <Box flexGrow={1} flexShrink={1}>
                  <Text wrap="truncate-end">{job.name}</Text>
                </Box>
                <Text color={LOOK[job.state].color}>{job.state}</Text>
                <Text dimColor>{job.at ? fmtShort(job.at) : ''}</Text>
              </Box>
              {job.step && (
                <Box paddingLeft={3}>
                  <Text color="warning" wrap="truncate-end">
                    {job.step}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
          {row.deploy?.state === 'Failed' && <Text dimColor wrap="truncate-end">{row.deploy.url}</Text>}
        </Box>
      )
    }

    // a card is its jobs, running steps and eight fixed lines; show as many whole cards as fit
    let used = 0
    const shown = v.rows.filter(row => {
      used += 8 + (row.deploy?.jobs.length ?? 0) * 1.5
      return used <= room
    })
    const count = (s: DeployState) => v.rows.filter(r => r.deploy?.state === s).length

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          <Text bold>Deploy previews</Text>
          <Text dimColor>{scope}</Text>
        </Box>
        <Text dimColor>
          {v.updatedAt ? `Updated ${fmtTime(v.updatedAt)}` : 'Not loaded yet'}
          {v.isLoading ? ' · refreshing…' : ''}
        </Text>
        {v.updatedAt && v.rows.length > 0 && (
          <Box flexDirection="row" gap={1} marginTop={1}>
            {count('Running') > 0 && chip(LOOK.Running, `${count('Running')} running`)}
            {count('Succeeded') > 0 && chip(LOOK.Succeeded, `${count('Succeeded')} succeeded`)}
            {count('Failed') > 0 && chip(LOOK.Failed, `${count('Failed')} failed`)}
            {v.rows.some(r => !r.deploy) && chip(LOOK.Queued, `${v.rows.filter(r => !r.deploy).length} no run`)}
          </Box>
        )}
        {!v.updatedAt && !v.error && <Text dimColor>Loading…</Text>}
        {v.error && (
          <Box borderStyle="round" borderColor="error" paddingX={1} marginTop={1}>
            <Text color="error">{`Error: ${v.error}`}</Text>
          </Box>
        )}
        {v.updatedAt && v.rows.length === 0 && !v.error && <Text dimColor>No matching open PRs.</Text>}
        {shown.map(card)}
        {shown.length < v.rows.length && <Text dimColor>+{v.rows.length - shown.length} more, enlarge the pane</Text>}
        <Text dimColor>Refreshes every 60s while open · /previews all · /previews PRE-1234</Text>
      </Box>
    )
  })
}
