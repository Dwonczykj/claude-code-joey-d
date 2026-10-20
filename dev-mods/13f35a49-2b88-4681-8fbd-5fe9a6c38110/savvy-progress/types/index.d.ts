export type Todos = { done: number; total: number }

export type SubAgent = {
  id: string
  name: string
  model: string
  steps: number
  tokens: number
  isDone: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'savvy-progress': { todos: Todos; agents: SubAgent[] }
  }
}
