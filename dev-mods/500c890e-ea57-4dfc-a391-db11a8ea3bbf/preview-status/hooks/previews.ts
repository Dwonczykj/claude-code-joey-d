import type { DeployState, Deploy, Job, JobState, Row } from '../types'

export type { DeployState, Deploy, Job, JobState, Row }

export const REPO = 'Fyxer-AI/web-app'
const RED = ['FAILURE', 'TIMED_OUT', 'STARTUP_FAILURE', 'ACTION_REQUIRED', 'CANCELLED', 'ERROR']

type Check = { name?: string; context?: string; status?: string; conclusion?: string; state?: string }
type RawStep = { status: string }
type RawJob = {
  name: string
  status: string
  conclusion: string
  startedAt: string
  completedAt: string
  steps: (RawStep & { name: string })[]
}
type RawRun = { status: string; conclusion: string; headSha: string; url: string; jobs: RawJob[] }
type RawPr = {
  number: number
  title: string
  url: string
  headRefName: string
  headRefOid: string
  statusCheckRollup: Check[]
}
export type Run = (argv: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>

export const ticketOf = (text: string): string | null => {
  const found = /PRE-\d+/i.exec(text)
  return found ? found[0].toUpperCase() : null
}

export const summariseChecks = (rollup: Check[]) => {
  const red: string[] = []
  let pending = 0
  for (const c of rollup ?? []) {
    const name = c.name ?? c.context ?? 'check'
    if (c.state) {
      if (RED.includes(c.state)) red.push(name)
      else if (c.state !== 'SUCCESS') pending++
    } else if (c.status !== 'COMPLETED') pending++
    else if (RED.includes(c.conclusion ?? '')) red.push(name)
  }
  return { red, pending }
}

const jobState = (j: RawJob): JobState => {
  if (j.status === 'completed') {
    if (j.conclusion === 'success') return 'succeeded'
    if (j.conclusion === 'cancelled') return 'cancelled'
    return 'failed'
  }
  return j.status === 'in_progress' ? 'running' : 'queued'
}

// gh reports an unstarted job as year 0001
const real = (iso: string): string | null => (iso && iso >= '2000' ? iso : null)

export const toJobs = (raw: RawJob[]): Job[] =>
  raw
    .filter(j => j.conclusion !== 'skipped')
    .map((j, i) => ({ j, i }))
    .sort((a, b) => Number(!/terraform/.test(a.j.name)) - Number(!/terraform/.test(b.j.name)) || a.i - b.i)
    .map(({ j }) => {
      const state = jobState(j)
      const current = j.steps.find(s => s.status === 'in_progress')
      const done = j.steps.filter(s => s.status === 'completed').length
      return {
        name: j.name,
        state,
        at: real(state === 'running' || state === 'queued' ? j.startedAt : j.completedAt),
        step: state === 'running' && current ? `step ${done + 1}/${j.steps.length}: ${current.name}` : null,
      }
    })

export const toDeploy = (run: RawRun, headSha: string): Deploy => {
  const jobs = toJobs(run.jobs)
  const failed = jobs.some(j => j.state === 'failed') || ['failure', 'timed_out', 'startup_failure', 'action_required'].includes(run.conclusion)
  const state: DeployState = failed
    ? 'Failed'
    : run.conclusion === 'cancelled'
      ? 'Cancelled'
      : run.status === 'completed'
        ? 'Succeeded'
        : run.status === 'in_progress'
          ? 'Running'
          : 'Queued'
  return { state, isStale: run.headSha !== headSha, url: run.url, jobs }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const two = (n: number) => String(n).padStart(2, '0')

export const fmtTime = (iso: string | number): string => {
  const d = new Date(iso)
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())} ${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// time only when it is today, the full stamp otherwise, so job rows stay narrow
export const fmtShort = (iso: string | number, now: number = Date.now()): string => {
  const d = new Date(iso)
  const today = new Date(now)
  return d.toDateString() === today.toDateString() ? fmtTime(iso).slice(0, 8) : fmtTime(iso)
}

const gh = async (run: Run, argv: string[]): Promise<string> => {
  const { exitCode, stdout, stderr } = await run(['gh', ...argv])
  if (exitCode !== 0) throw new Error(stderr.trim().split('\n')[0] || `gh exited ${exitCode}`)
  return stdout
}

// at most `limit` PRs in flight, so a long list does not hit GitHub's secondary rate limit
const pool = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

const rowFor = async (run: Run, pr: RawPr): Promise<Row> => {
  const { red, pending } = summariseChecks(pr.statusCheckRollup)
  const row: Row = { number: pr.number, title: pr.title, url: pr.url, branch: pr.headRefName, lastCommit: null, red, pending, deploy: null, error: null }
  try {
    const commit = (await gh(run, ['pr', 'view', String(pr.number), '--repo', REPO, '--json', 'commits', '--jq', '.commits[-1].committedDate'])).trim()
    row.lastCommit = commit || null
    const runs = JSON.parse(await gh(run, ['run', 'list', '--repo', REPO, '--workflow', 'deploy-preview.yml', '--branch', pr.headRefName, '--limit', '1', '--json', 'databaseId']))
    if (runs.length > 0) {
      const detail = JSON.parse(await gh(run, ['run', 'view', String(runs[0].databaseId), '--repo', REPO, '--json', 'status,conclusion,headSha,url,jobs']))
      row.deploy = toDeploy(detail, pr.headRefOid)
    }
  } catch (err) {
    row.error = err instanceof Error ? err.message : String(err)
  }
  return row
}

// ticket mode lists any open PR of yours whose branch, title or body names the ticket; all mode lists those labelled deploy:preview
export const fetchRows = async (run: Run, ticket: string | null): Promise<Row[]> => {
  const list = ['pr', 'list', '--repo', REPO, '--author', '@me', '--state', 'open', '--limit', '100', '--json', 'number,title,url,body,headRefName,headRefOid,statusCheckRollup']
  const prs: (RawPr & { body: string })[] = JSON.parse(await gh(run, ticket ? list : [...list, '--label', 'deploy:preview']))
  const names = (text: string) => new RegExp(`\\b${ticket}\\b`, 'i').test(text)
  const wanted = ticket ? prs.filter(p => names(`${p.headRefName} ${p.title} ${p.body ?? ''}`)) : prs
  const rows = await pool(wanted, 4, pr => rowFor(run, pr))
  return rows.sort((a, b) => (b.lastCommit ?? '').localeCompare(a.lastCommit ?? ''))
}
