export const NONE = 'No progress.md in session'

// The pane's text: the State board's "last updated" stamp, the first fenced
// block after "Dependency tree", and the "Open questions for Joey" list.
export const extract = (text: string): string => {
  const board = text.split(/^## Log\b/m)[0] ?? ''
  const stamp = board.match(/^## State board.*?last updated ([^)]+)\)/m)?.[1]
  const tree = board.match(/Dependency tree[^\n]*\n[\s\S]*?```[^\n]*\n([\s\S]*?)\n```/)?.[1]
  if (tree === undefined) return 'progress.md has no State board tree'
  const questions = board.match(/^Open questions for Joey:\n((?:- .*\n?)+)/m)?.[1]?.trimEnd()
  const head = `Last updated ${stamp ?? 'unknown'}`
  return [head, '', tree, ...(questions ? ['', 'Open questions for Joey:', questions] : [])].join('\n')
}

// A progress.md path the person named in a prompt, the last one wins.
export const namedPath = (prompt: string): string | undefined =>
  prompt.match(/\/[^\s'"`]*\/progress\.md\b/g)?.at(-1)
