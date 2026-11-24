import type { ErrorCode } from '@shared/ipc/result'
import { IpcError } from './ipc-client'

const MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: 'Certaines informations saisies ne sont pas valides.',
  NOT_FOUND: "L'élément demandé est introuvable.",
  CONFLICT: 'Cette opération entre en conflit avec des données existantes.',
  BUSINESS_RULE: "Cette opération n'est pas autorisée.",
  INTERNAL: "Une erreur inattendue s'est produite. Le détail a été enregistré dans le journal."
}

/** Message FR affichable pour n'importe quelle erreur. Les règles métier gardent leur message. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof IpcError) {
    return err.code === 'BUSINESS_RULE' || err.code === 'CONFLICT'
      ? err.message
      : MESSAGES[err.code]
  }
  return MESSAGES.INTERNAL
}

export function getErrorCode(err: unknown): ErrorCode | 'UNKNOWN' {
  return err instanceof IpcError ? err.code : 'UNKNOWN'
}
