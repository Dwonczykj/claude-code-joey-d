import { expect, test } from 'claude-code/testing'

import { skinFor, summarise } from './skins'

test('edits and writes share the edit colour', () => {
  expect(skinFor('Edit').slot).toBe('edit')
  expect(skinFor('Write').slot).toBe('edit')
})

test('unknown tools fall back', () => {
  expect(skinFor('Mystery').icon).toBe('•')
})

test('summary is the first line of the main argument', () => {
  expect(summarise({ command: 'ls\nmore' })).toBe('ls')
  expect(summarise(null)).toBe('')
})
