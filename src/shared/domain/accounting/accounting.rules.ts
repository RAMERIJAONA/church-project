/**
 * Règles pures de la comptabilité : normalisation des saisies et calcul des cases de montant.
 * Numérotation : accounting.codes.ts ; construction de l'arbre : accounting.tree.ts.
 */
import type { CellDTO, ItemLevel } from './accounting.types'

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
}

/** Case détaillée : plusieurs saisies, ou une saisie avec libellé. */
export function isDetailed(entries: readonly EntryLike[]): boolean {
  return entries.length > 1 || entries.some((e) => e.label !== null)
}

/** Case du tableau : somme des saisies actives (`null` si aucune). */
export function cellOf(entries: readonly EntryLike[]): CellDTO {
  return {
    total: entries.length === 0 ? null : entries.reduce((sum, e) => sum + e.amount, 0),
    entryCount: entries.length,
    detailed: isDetailed(entries)
  }
}
