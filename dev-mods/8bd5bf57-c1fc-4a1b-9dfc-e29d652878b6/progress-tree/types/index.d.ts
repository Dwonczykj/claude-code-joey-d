export type View = string

declare module 'claude-code' {
  interface PluginState {
    'progress-tree': { view: View; title: string; namedPath: string }
  }
}
