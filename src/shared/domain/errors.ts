import type { ErrorCode } from '../ipc/result'

/** Erreur métier/attendue : son code et son message remontent tels quels à l'UI. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}
