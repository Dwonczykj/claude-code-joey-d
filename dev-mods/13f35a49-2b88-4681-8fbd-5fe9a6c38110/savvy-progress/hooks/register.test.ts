import { expect, test } from 'claude-code/testing'

import { bar, compact } from './format'

test('bar fills in proportion', () => {
  expect(bar(1, 4, 8)).toBe('██░░░░░░')
  expect(bar(0, 0, 4)).toBe('░░░░')
  expect(bar(4, 4, 4)).toBe('████')
})

test('compact abbreviates thousands', () => {
  expect(compact(950)).toBe('950')
  expect(compact(12500)).toBe('12.5k')
})
