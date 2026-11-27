import { getErrorMessage } from '@renderer/lib/error-messages'
import { IpcError } from '@renderer/lib/ipc-client'
import { isBlankQuery } from '@shared/domain/members/members.search'
import type { MemberConflictDetails } from '@shared/domain/members/members.types'

/** Nombre de pages de la liste (au moins 1, même vide). */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

/** Page ramenée sur la dernière qui existe (ex. après la suppression du dernier fidèle). */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(page, pageCount(total, pageSize))
}

const count = new Intl.NumberFormat('fr-FR')

/** « 1 248 fidèles », « 3 résultats pour « rakto » » */
export function resultLabel(total: number, query: string): string {
  const q = query.trim()
  const n = count.format(total)
  // Même règle que le service : sans lettre ni chiffre, ce n'est pas une recherche
  if (isBlankQuery(q)) return `${n} ${total > 1 ? 'fidèles' : 'fidèle'}`
  return `${n} ${total > 1 ? 'résultats' : 'résultat'} pour « ${q} »`
}

/** Détail d'un conflit renvoyé par le service des fidèles, `null` pour toute autre erreur. */
export function conflictDetails(err: unknown): MemberConflictDetails | null {
  if (!(err instanceof IpcError) || err.code !== 'CONFLICT') return null
  const details = err.details as Partial<MemberConflictDetails> | undefined
  return details?.reason === 'name-taken' || details?.reason === 'registration-number-taken'
    ? (details as MemberConflictDetails)
    : null
}

/** Erreur du service à afficher dans le formulaire : sous un champ, ou en tête. */
export interface MemberServerError {
  field?: 'registrationNumber' | 'firstName' | 'birthDate' | 'phone'
  message: string
}

const FIELDS = ['birthDate', 'phone'] as const

export function serverErrorOf(err: unknown): MemberServerError {
  const conflict = conflictDetails(err)
  if (conflict && err instanceof IpcError) {
    const field = conflict.reason === 'name-taken' ? 'firstName' : 'registrationNumber'
    return { field, message: err.message }
  }
  if (err instanceof IpcError && err.code === 'VALIDATION') {
    const field = (err.details as { field?: unknown } | undefined)?.field
    const known = FIELDS.find((f) => f === field)
    if (known) return { field: known, message: err.message }
  }
  return { message: getErrorMessage(err) }
}
