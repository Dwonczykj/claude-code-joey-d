import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { extract, namedPath, NONE } from './parse'

// The shared PRE-3286 board, and the rule that ties a session to it. Change
// these two to point the mod at another build.
const BUILD_PATH =
  '/Users/joey/FyxerGh/fyxer-web-app-trees/cf-meeting-actions/.scratch/connector-write-out/progress.md'
const BUILD_ROOM = '/Users/joey/FyxerGh/build-room'
const isBuildSession = (cwd: string, title: string) =>
  cwd.startsWith('/Users/joey/FyxerGh/fyxer-web-app-trees/cf-') ||
  /^(connector-writes|PRE-3286)/i.test(title)

const PANE = 'progress-tree'
const POLL_MS = 5000
const view = atom({ plugin: 'progress-tree', key: 'view' } as const, NONE)
const title = atom({ plugin: 'progress-tree', key: 'title' } as const, '')
const named = atom({ plugin: 'progress-tree', key: 'namedPath' } as const, '')

export const register: Register = on => {
  let seen = ''

  on('session.start', async ($, e, next) => {
    const newestBoard = async (root: string): Promise<string | undefined> => {
      const dirs = (await $.fs.exists(root)) ? await $.fs.list(root) : []
      const found = await Promise.all(
        dirs
          .filter(d => d.kind === 'dir')
          .map(d => $.fs.stat(`${root}/${d.name}/progress.md`)
            .then(s => ({ path: `${root}/${d.name}/progress.md`, mtimeMs: s.mtimeMs }))
            .catch(() => undefined)),
      )
      return found.flatMap(f => (f ? [f] : [])).sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.path
    }

    // Order: a path named in a prompt, then BUILD_PATH for a session of this
    // build (the coordinator's cwd holds newer, unrelated boards), then
    // <cwd>/.scratch/*/progress.md newest first, then the newest orchestrated
    // run in BUILD_ROOM, which is where sf:orchestrate keeps new builds.
    const find = async (): Promise<string | undefined> => {
      const fromPrompt = await read($, named)
      if (fromPrompt && (await $.fs.exists(fromPrompt))) return fromPrompt
      const cwd = await $.session.cwd()
      if (isBuildSession(cwd, await read($, title))) return BUILD_PATH
      return (await newestBoard(`${cwd}/.scratch`)) ?? (await newestBoard(BUILD_ROOM))
    }

    // Re-reads only when the path or its mtime moved. Never writes the file.
    const refresh = async () => {
      const path = await find()
      const stat = path ? await $.fs.stat(path).catch(() => undefined) : undefined
      const key = path && stat ? `${path}@${stat.mtimeMs}` : ''
      if (key === seen) return
      seen = key
      const text = path && stat ? extract(await $.fs.read(path)) : NONE
      await update($, view, () => text)
    }

    await $.command.register({ name: 'progress-tree', description: 'Show the progress.md dependency tree pane' })
    await refresh()
    $.clock.every(POLL_MS, () => void refresh().catch(() => undefined))
    void $.ui.open({ id: PANE, title: 'Progress tree' })

    return next(e)
  })

  on('classic.UserPromptSubmit', async ($, e, next) => {
    const path = namedPath(e.prompt)
    // never hold up the prompt over a bookkeeping write
    await Promise.all([
      e.session_title ? update($, title, () => e.session_title ?? '') : undefined,
      path ? update($, named, () => path) : undefined,
    ]).catch(() => undefined)

    return next(e)
  })

  on('command.run', { command: 'progress-tree' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Progress tree' })

    return { text: 'Progress tree pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const lines = (await read($, view)).split('\n')

    return (
      <Box flexDirection="column">
        {lines.map((line, i) => (
          <Text bold={i === 0} wrap="truncate-end">{line || ' '}</Text>
        ))}
      </Box>
    )
  })
}
