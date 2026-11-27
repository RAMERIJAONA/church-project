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

/** « 1 foyer », « 2 275 foyers » */
export function countLabel(total: number, one: string, many: string): string {
  return `${count.format(total)} ${total > 1 ? many : one}`
}

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
  return details?.reason === 'name-taken' || details?.reason === 'rank-taken'
    ? (details as MemberConflictDetails)
    : null
}

/** Erreur du service à afficher dans le formulaire : sous un champ, ou en tête. */
export interface MemberServerError {
  field?: 'firstName' | 'birthDate' | 'phone' | 'role' | 'sex'
  message: string
}

const FIELDS = ['birthDate', 'phone', 'sex'] as const

export function serverErrorOf(err: unknown): MemberServerError {
  const conflict = conflictDetails(err)
  if (conflict && err instanceof IpcError) {
    return { field: conflict.reason === 'name-taken' ? 'firstName' : 'role', message: err.message }
  }
  if (err instanceof IpcError && (err.code === 'VALIDATION' || err.code === 'BUSINESS_RULE')) {
    const field = (err.details as { field?: unknown } | undefined)?.field
    const known = FIELDS.find((f) => f === field)
    if (known) return { field: known, message: err.message }
  }
  return { message: getErrorMessage(err) }
}

/** Numéros de foyers lisibles : « 3 », « 3 et 7 », « 3, 5 et 7 ». */
export function householdNumbersLabel(numbers: readonly number[]): string {
  if (numbers.length <= 1) return numbers.join('')
  return `${numbers.slice(0, -1).join(', ')} et ${numbers.at(-1)}`
}
