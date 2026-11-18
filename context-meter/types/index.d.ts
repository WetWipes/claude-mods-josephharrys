export type ContextMeterLine = string
declare module 'claude-code' {
  interface PluginState { 'context-meter': { line: ContextMeterLine } }
}
