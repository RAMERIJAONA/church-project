/** Codes d'erreur stables : loggés côté main, traduits en message FR côté UI. */
export const ERROR_CODES = [
  'VALIDATION',
  'NOT_FOUND',
  'CONFLICT',
  'BUSINESS_RULE',
  'INTERNAL'
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export interface ResultError {
  code: ErrorCode
  message: string
  details?: unknown
}

/** Tout ce qui traverse l'IPC est un Result : aucune exception ne passe la frontière. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: ResultError }
