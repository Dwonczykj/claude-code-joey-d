import { expect, test } from 'claude-code/testing'

import { extract, namedPath } from './parse'

const FILE = `# x

## State board (kept current by "c"; last updated 2026-10-15 13:55)

Dependency tree (an arrow means "stacks on"):

\`\`\`
staging
└─ #1  slice 1   PR
\`\`\`

Probes and leftovers (never merge):
- probe

Open questions for Joey:
- q one
- q two

Next actions: x

## Log
\`\`\`
old tree
\`\`\`
`

test('extract keeps the stamp, the tree and the open questions only', async () => {
  expect(extract(FILE)).toBe(
    'Last updated 2026-10-15 13:55\n\nstaging\n└─ #1  slice 1   PR\n\nOpen questions for Joey:\n- q one\n- q two',
  )
})

test('extract says so when there is no board', async () => {
  expect(extract('# nothing\n## Log\n')).toBe('progress.md has no State board tree')
})

test('namedPath takes the last absolute progress.md path in a prompt', async () => {
  expect(namedPath('see /a/b/progress.md and /c/.scratch/x/progress.md.')).toBe('/c/.scratch/x/progress.md')
  expect(namedPath('no path here')).toBeUndefined()
})
