import { join } from 'node:path'
import log from 'electron-log/main'
import type { LogLevel, LogSink } from './logger'

export interface ElectronLogOptions {
  /** Dossier des logs (userData/logs). */
  logsDir: string
  /** 'debug' en dev ou avec --debug, 'info' sinon. */
  level: LogLevel
  /** Écrire aussi dans la console (dev). */
  console: boolean
}

const MAX_LOG_FILE_BYTES = 5 * 1024 * 1024

/** Fichier userData/logs/main.log, rotation par taille (main.old.log), une ligne JSON par entrée. */
export function createElectronLogSink(options: ElectronLogOptions): LogSink {
  log.transports.file.resolvePathFn = () => join(options.logsDir, 'main.log')
  log.transports.file.maxSize = MAX_LOG_FILE_BYTES
  log.transports.file.level = options.level
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
  log.transports.console.level = options.console ? options.level : false
  return {
    write(level, message, context) {
      log[level](`${message} ${JSON.stringify(context)}`)
    }
  }
}
