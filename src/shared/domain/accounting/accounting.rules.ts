/**
 * Règles pures de la comptabilité : normalisation des saisies et calcul des cases de montant.
 * Numérotation : accounting.codes.ts ; construction de l'arbre : accounting.tree.ts.
 */
import { defaultOperationDate } from './accounting.periods'
import type { CellDTO, EntryType, ItemLevel } from './accounting.types'

/** « a » → « A ». La validation (alphabet malgache) est faite par `sectionPrefixSchema`. */
export function normalizePrefix(prefix: string): string {
  return prefix.trim().toUpperCase()
}

/** Niveau 1 : toujours en MAJUSCULES. Autres niveaux : casse saisie. */
export function normalizeDescription(level: ItemLevel, description: string): string {
  const trimmed = description.trim()
  return level === 1 ? trimmed.toUpperCase() : trimmed
}

interface EntryLike {
  amount: number
  label: string | null
  /** ISO 8601 UTC : se compare comme une chaîne */
  updatedAt: string
}

/** Case détaillée : plusieurs saisies, ou une saisie avec libellé. */
export function isDetailed(entries: readonly Omit<EntryLike, 'updatedAt'>[]): boolean {
  return entries.length > 1 || entries.some((e) => e.label !== null)
}

/** Case du tableau : somme des saisies actives (`null` si aucune). */
export function cellOf(entries: readonly EntryLike[]): CellDTO {
  return {
    total: entries.length === 0 ? null : entries.reduce((sum, e) => sum + e.amount, 0),
    entryCount: entries.length,
    detailed: isDetailed(entries),
    lastEntryAt: entries.reduce<string | null>(
      (last, e) => (last === null || e.updatedAt > last ? e.updatedAt : last),
      null
    )
  }
}

/**
 * Réalisation : date d'opération obligatoire, dans l'année de la case. Estimation (annuelle) :
 * aucune date. Renvoie le message d'erreur, ou `null` si la date convient.
 */
export function operationDateError(
  type: EntryType,
  year: number,
  operatedOn: string | null
): string | null {
  if (type === 'estimate') {
    return operatedOn === null ? null : 'Une estimation est annuelle : pas de date.'
  }
  return operatedOn !== null && Number(operatedOn.slice(0, 4)) === year
    ? null
    : `La date de la réalisation doit être en ${year}.`
}

/**
 * Date d'opération d'une nouvelle saisie : celle fournie (`given`, seed et tests), sinon
 * automatique (l'UI n'en envoie jamais) : aujourd'hui ramené dans l'année pour une
 * réalisation, aucune pour une estimation.
 */
export function newEntryOperationDate(
  type: EntryType,
  year: number,
  now: Date,
  given?: string | null
): string | null {
  if (given !== undefined) return given
  return type === 'actual' ? defaultOperationDate(now, year) : null
}
