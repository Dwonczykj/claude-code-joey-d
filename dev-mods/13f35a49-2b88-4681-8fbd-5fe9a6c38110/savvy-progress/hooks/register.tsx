import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { SubAgent, Todos } from '../types'
import { bar, compact } from './format'

const PANE = 'savvy-agents'
const todos = atom({ plugin: 'savvy-progress', key: 'todos' } as const, { done: 0, total: 0 } as Todos)
const agents = atom({ plugin: 'savvy-progress', key: 'agents' } as const, [] as SubAgent[])

export const register: Register = on => {
  // tool_use_id of the Agent call -> the subagent's loop id, so turn.step can find its row
  const loopOf = new Map<string, string>()

  on('session.start', async ($, e, next) => {
    await update($, todos, () => ({ done: 0, total: 0 }))
    await update($, agents, () => [])

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)

    if (spawned.deny === undefined) {
      const agent: SubAgent = {
        id: e.tool_use_id,
        name: e.description || e.subagentType,
        model: spawned.model,
        steps: 0,
        tokens: 0,
        isDone: false,
      }
      if (spawned.agentId) loopOf.set(spawned.agentId, e.tool_use_id)
      await update($, agents, list => [...list, agent].slice(-30))
      void $.ui.open({ id: PANE, title: 'Sub-agents' })
    }

    return spawned
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool === 'TodoWrite' && e.agentId === undefined) {
      const done = e.todos.filter(t => t.status === 'completed').length
      await update($, todos, () => ({ done, total: e.todos.length }))
    }

    const ran = await next(e)

    await update($, agents, list =>
      list.map(a => (a.id === e.tool_use_id ? { ...a, isDone: true } : a)),
    )

    return ran
  })

  on('turn.step', async function* ($, e, next) {
    const response = yield* next(e)
    const id = e.agentId === undefined ? undefined : loopOf.get(e.agentId)

    if (id !== undefined && response.usage) {
      const u = response.usage
      const used = u.input_tokens + u.output_tokens + u.cache_creation_input_tokens
      await update($, agents, list =>
        list.map(a => (a.id === id ? { ...a, steps: a.steps + 1, tokens: a.tokens + used } : a)),
      )
    }

    return response
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const t = await read($, todos)
    const running = (await read($, agents)).filter(a => !a.isDone).length

    if (e.props.hasSurvey || (t.total === 0 && running === 0)) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        {t.total > 0 && (
          <Text color="success">
            {bar(t.done, t.total)} {t.done}/{t.total} tasks
          </Text>
        )}
        {running > 0 && <Text dimColor>{t.total > 0 ? '  ·  ' : ''}{running} sub-agent{running === 1 ? '' : 's'} running</Text>}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, agents)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 4)

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>No sub-agents yet.</Text>}
        {list.slice(-room).map(a => (
          <Text dimColor={a.isDone} color={a.isDone ? undefined : 'success'}>
            {a.isDone ? '✓' : '●'} {a.name} · {a.model} · {a.steps} steps · {compact(a.tokens)} tok
          </Text>
        ))}
      </Box>
    )
  })
}
