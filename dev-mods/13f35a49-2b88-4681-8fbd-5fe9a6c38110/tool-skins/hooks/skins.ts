export type Palette = {
  edit: string
  read: string
  run: string
  search: string
  web: string
  agent: string
  other: string
}

export const THEMES: Record<string, Palette> = {
  tokyo: { edit: '#ff9e64', read: '#7aa2f7', run: '#9ece6a', search: '#bb9af7', web: '#7dcfff', agent: '#e0af68', other: '#a9b1d6' },
  nord: { edit: '#d08770', read: '#81a1c1', run: '#a3be8c', search: '#b48ead', web: '#88c0d0', agent: '#ebcb8b', other: '#d8dee9' },
  dracula: { edit: '#ffb86c', read: '#8be9fd', run: '#50fa7b', search: '#bd93f9', web: '#8be9fd', agent: '#f1fa8c', other: '#f8f8f2' },
  gruvbox: { edit: '#fe8019', read: '#83a598', run: '#b8bb26', search: '#d3869b', web: '#8ec07c', agent: '#fabd2f', other: '#ebdbb2' },
}

type Skin = { icon: string; slot: keyof Palette }

const SKINS: Record<string, Skin> = {
  Edit: { icon: '✎', slot: 'edit' },
  MultiEdit: { icon: '✎', slot: 'edit' },
  Write: { icon: '✚', slot: 'edit' },
  NotebookEdit: { icon: '✎', slot: 'edit' },
  Read: { icon: '▤', slot: 'read' },
  Bash: { icon: '❯', slot: 'run' },
  Grep: { icon: '⌕', slot: 'search' },
  Glob: { icon: '⌕', slot: 'search' },
  WebFetch: { icon: '◎', slot: 'web' },
  WebSearch: { icon: '◎', slot: 'web' },
  Agent: { icon: '◆', slot: 'agent' },
  Task: { icon: '◆', slot: 'agent' },
}

export const skinFor = (tool: string): Skin => SKINS[tool] ?? { icon: '•', slot: 'other' }

const ARG_KEYS = ['file_path', 'command', 'pattern', 'url', 'query', 'description', 'path']

export function summarise(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  const row = input as Record<string, unknown>
  const key = ARG_KEYS.find(k => typeof row[k] === 'string')

  return key ? String(row[key]).split('\n')[0].slice(0, 80) : ''
}
