import type { Register } from 'claude-code'
import { BRANCH_PREFIX, firstCdDir, judgePush } from './judgePush'

export const register: Register = on => {
  on('tool.check', { tool: 'Bash' }, async ($, e, next) => {
    const input = e.input
    const command = typeof input === 'object' && input !== null && 'command' in input ? input.command : undefined
    if (typeof command !== 'string' || !/\bgit\b.*\bpush\b/.test(command)) return next(e)

    const base = await next(e)
    if (base.decision === 'deny') return base

    const dir = firstCdDir(command)
    const head = await $.process
      .run(['git', ...(dir ? ['-C', dir] : []), 'branch', '--show-current'])
      .catch(() => undefined)
    const branch = judgePush(command, head?.stdout.trim() ?? '')
    if (!branch) return base

    if (e.tool_use_id) $.ui.status(`push ok: ${branch}`)
    return { decision: 'allow', reason: `${$.plugin.name}: plain push of one ${BRANCH_PREFIX} branch` }
  })
}
