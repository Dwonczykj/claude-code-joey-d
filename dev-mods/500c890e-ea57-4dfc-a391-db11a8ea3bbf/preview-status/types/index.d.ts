export type JobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type Job = { name: string; state: JobState; at: string | null; step: string | null }
export type DeployState = 'Running' | 'Succeeded' | 'Failed' | 'Cancelled' | 'Queued'
export type Deploy = { state: DeployState; isStale: boolean; url: string; jobs: Job[] }
export type Row = {
  number: number
  title: string
  url: string
  branch: string
  lastCommit: string | null
  red: string[]
  pending: number
  deploy: Deploy | null
  error: string | null
}

export type View = {
  mode: 'ticket' | 'all'
  ticket: string | null
  rows: Row[]
  updatedAt: number | null
  error: string | null
  isLoading: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'preview-status': { view: View }
  }
}
