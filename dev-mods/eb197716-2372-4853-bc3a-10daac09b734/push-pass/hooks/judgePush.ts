const BRANCH_PREFIX = 'joeydwonczyk/'
const BRANCH_NAME = /^joeydwonczyk\/[A-Za-z0-9._/-]+$/
const SHELL_TRICKS = /\$\(|`|<|>|\\|"|'/
const HARMLESS_SEGMENTS = [/^cd [^\s$`();<>&|*?\\"']+$/, /^(tail|head) -\d+$/, /^sleep \d+$/]
const PUSH_FLAGS = new Set(['-u', '--set-upstream', '-q', '--quiet'])

const segmentsOf = (command: string) =>
  command
    .replaceAll('2>&1', '')
    .split(/&&|\|\||;|\||\n/)
    .map(segment => segment.trim())
    .filter(Boolean)

export const firstCdDir = (command: string) =>
  segmentsOf(command)
    .find(segment => segment.startsWith('cd '))
    ?.slice(3)

const pushedBranch = (segment: string, currentBranch: string) => {
  const tokens = segment.split(/\s+/)
  if (tokens[0] !== 'git') return undefined
  const afterC = tokens[1] === '-C' ? tokens.slice(3) : tokens.slice(1)
  const [verb, ...rest] = afterC
  if (verb !== 'push') return undefined
  const flags = rest.filter(token => token.startsWith('-'))
  const positional = rest.filter(token => !token.startsWith('-'))
  if (!flags.every(flag => PUSH_FLAGS.has(flag))) return undefined
  if (positional.length !== 2 || positional[0] !== 'origin') return undefined
  const [source, destination] = positional[1].split(':')
  const branch = destination ?? (source === 'HEAD' ? currentBranch : source)
  if (destination !== undefined && !source) return undefined
  return BRANCH_NAME.test(branch) && !branch.includes('..') ? branch : undefined
}

// Returns the branch when the whole command is one safe push, else undefined (defer to the normal check).
export const judgePush = (command: string, currentBranch: string) => {
  if (SHELL_TRICKS.test(command.replaceAll('2>&1', ''))) return undefined
  const segments = segmentsOf(command)
  const pushes = segments.filter(segment => /^git( -C \S+)? push\b/.test(segment))
  if (pushes.length !== 1) return undefined
  const isAllSafe = segments.every(
    segment => segment === pushes[0] || HARMLESS_SEGMENTS.some(pattern => pattern.test(segment)),
  )
  return isAllSafe ? pushedBranch(pushes[0], currentBranch) : undefined
}

export { BRANCH_PREFIX }
