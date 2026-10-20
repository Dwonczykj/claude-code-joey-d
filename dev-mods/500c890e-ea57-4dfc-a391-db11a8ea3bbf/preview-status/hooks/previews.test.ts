import { expect, test } from 'claude-code/testing'

import { fetchRows, fmtShort, summariseChecks, ticketOf, toDeploy, toJobs } from './previews'

const job = (name: string, status: string, conclusion: string, steps: { name: string; status: string }[] = []) => ({
  name,
  status,
  conclusion,
  startedAt: '2026-10-08T10:00:00Z',
  completedAt: status === 'completed' ? '2026-10-08T10:05:00Z' : '0001-01-01T00:00:00Z',
  steps,
})

test('ticketOf finds the code in a branch name', () => {
  expect(ticketOf('joeydwonczyk/fix-pre-3395-x')).toBe('PRE-3395')
  expect(ticketOf('main')).toBe(null)
})

test('summariseChecks ignores skipped and counts red and pending', () => {
  const out = summariseChecks([
    { name: 'a', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'b', status: 'COMPLETED', conclusion: 'SKIPPED' },
    { name: 'c', status: 'COMPLETED', conclusion: 'FAILURE' },
    { name: 'd', status: 'IN_PROGRESS', conclusion: '' },
    { context: 'e', state: 'ERROR' },
  ])
  expect(out.red).toEqual(['c', 'e'])
  expect(out.pending).toBe(1)
})

test('toJobs puts terraform first, drops skipped, and numbers the running step', () => {
  const jobs = toJobs([
    job('build', 'completed', 'success'),
    job('skipme', 'completed', 'skipped'),
    job('terraform-core', 'in_progress', '', [
      { name: 'one', status: 'completed' },
      { name: 'two', status: 'in_progress' },
      { name: 'three', status: 'queued' },
    ]),
  ])
  expect(jobs.map(j => j.name)).toEqual(['terraform-core', 'build'])
  expect(jobs[0].step).toBe('step 2/3: two')
  expect(jobs[0].state).toBe('running')
})

test('toDeploy marks a failed run and a stale sha', () => {
  const run = { status: 'completed', conclusion: 'failure', headSha: 'old', url: 'u', jobs: [job('a', 'completed', 'success')] }
  const out = toDeploy(run, 'new')
  expect(out.state).toBe('Failed')
  expect(out.isStale).toBe(true)
})

test('fetchRows filters by ticket and sorts newest commit first', async () => {
  const pr = (number: number, branch: string, title = 't') => ({ number, title, url: 'u', body: '', headRefName: branch, headRefOid: 'x', statusCheckRollup: [] })
  const calls: string[][] = []
  const run = async (argv: string[]) => {
    calls.push(argv)
    const s = argv.join(' ')
    if (s.includes('pr list')) return { exitCode: 0, stdout: JSON.stringify([pr(1, 'a/fix-PRE-5-x'), pr(2, 'a/feat-PRE-5-y'), pr(3, 'a/feat-PRE-55-z')]), stderr: '' }
    if (s.includes('pr view')) return { exitCode: 0, stdout: argv[3] === '1' ? '2026-10-01T00:00:00Z\n' : '2026-10-02T00:00:00Z\n', stderr: '' }
    return { exitCode: 0, stdout: '[]', stderr: '' }
  }
  const rows = await fetchRows(run, 'PRE-5')
  expect(rows.map(r => r.number)).toEqual([2, 1])
  expect(rows[0].deploy).toBe(null)
})

test('fmtShort drops the date for today only', () => {
  const now = new Date(2026, 9, 13, 12, 0, 0).getTime()
  expect(fmtShort(new Date(2026, 9, 13, 9, 5, 7).getTime(), now)).toBe('09:05:07')
  expect(fmtShort(new Date(2026, 9, 12, 9, 5, 7).getTime(), now)).toBe('09:05:07 Mon 12 Oct')
})
