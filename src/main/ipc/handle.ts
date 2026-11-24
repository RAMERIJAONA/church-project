import type { IpcMain } from 'electron'
import type { Logger } from '@main/logging/logger'
import { AppError } from '@shared/domain/errors'
import { ipcInputs, type Channel, type IpcOutputs, type IpcParsed } from '@shared/ipc/contract'
import type { Result } from '@shared/ipc/result'

export type Handler<C extends Channel> = (
  input: IpcParsed<C>
) => IpcOutputs[C] | Promise<IpcOutputs[C]>

/**
 * Exécute un handler : validation zod → handler → Result. Toute exception est convertie
 * (AppError → son code, le reste → INTERNAL) et loggée avec reqId, canal, durée.
 */
export async function runHandler<C extends Channel>(
  channel: C,
  fn: Handler<C>,
  raw: unknown,
  logger: Logger
): Promise<Result<IpcOutputs[C]>> {
  const reqId = crypto.randomUUID().slice(0, 8)
  const start = performance.now()
  const ms = (): number => Math.round(performance.now() - start)
  const parsed = ipcInputs[channel].safeParse(raw)

  if (!parsed.success) {
    logger.warn({ reqId, channel, issues: parsed.error.issues }, 'ipc validation failed')
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'Données invalides', details: parsed.error.issues }
    }
  }

  try {
    const data = await fn(parsed.data as IpcParsed<C>)
    logger.debug({ reqId, channel, ms: ms() }, 'ipc ok')
    return { ok: true, data }
  } catch (err) {
    if (err instanceof AppError) {
      logger.warn({ reqId, channel, ms: ms(), code: err.code, details: err.details }, err.message)
      return { ok: false, error: { code: err.code, message: err.message, details: err.details } }
    }
    logger.error({ reqId, channel, ms: ms(), err }, 'ipc unexpected error')
    return { ok: false, error: { code: 'INTERNAL', message: 'Erreur inattendue' } }
  }
}

export type Handle = <C extends Channel>(channel: C, fn: Handler<C>) => void

/** UN seul point d'enregistrement pour tous les handlers. */
export function createHandle(ipcMain: Pick<IpcMain, 'handle'>, logger: Logger): Handle {
  return (channel, fn) => {
    ipcMain.handle(channel, (_event, raw: unknown) => runHandler(channel, fn, raw, logger))
  }
}
