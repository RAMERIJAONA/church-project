/**
 * Logger structuré : chaque entrée = un message court + un contexte JSON
 * (reqId, channel, ms, code…). La destination (fichier electron-log, mémoire en test)
 * est un "sink" injecté : ce module n'importe rien d'Electron.
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'
export type LogContext = Record<string, unknown>

export interface LogSink {
  write(level: LogLevel, message: string, context: LogContext): void
}

export interface Logger {
  error(context: LogContext, message: string): void
  warn(context: LogContext, message: string): void
  info(context: LogContext, message: string): void
  debug(context: LogContext, message: string): void
  child(base: LogContext): Logger
}

/** Les Error ne se sérialisent pas en JSON (champs non énumérables) : on les aplatit. */
export function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    const extra = Object.fromEntries(Object.entries(err))
    return { name: err.name, message: err.message, stack: err.stack, ...extra }
  }
  return err
}

function normalize(context: LogContext): LogContext {
  const out: LogContext = {}
  for (const [k, v] of Object.entries(context)) out[k] = v instanceof Error ? serializeError(v) : v
  return out
}

export function createLogger(sink: LogSink, base: LogContext = {}): Logger {
  const log =
    (level: LogLevel) =>
    (context: LogContext, message: string): void =>
      sink.write(level, message, normalize({ ...base, ...context }))
  return {
    error: log('error'),
    warn: log('warn'),
    info: log('info'),
    debug: log('debug'),
    child: (extra) => createLogger(sink, { ...base, ...extra })
  }
}

export interface MemorySink extends LogSink {
  entries: Array<{ level: LogLevel; message: string; context: LogContext }>
}

/** Sink en mémoire, pour les tests. */
export function createMemorySink(): MemorySink {
  const entries: MemorySink['entries'] = []
  return { entries, write: (level, message, context) => entries.push({ level, message, context }) }
}
