/**
 * Colonnes et titres de la comptabilité, partagés par l'écran, l'impression (renderer) et
 * l'export Excel (main). Fonctions pures.
 */
import type { EntryType, Ledger } from './accounting.types'

/** Les 3 colonnes de l'année affichée N, dans l'ordre du tableau. */
export const AMOUNT_COLUMNS = ['estimate', 'actual', 'nextEstimate'] as const
export type AmountColumn = (typeof AMOUNT_COLUMNS)[number]

/** Année et type réellement écrits par une colonne (Estimation N+1 = estimation de N+1). */
export function columnTarget(year: number, col: AmountColumn): { year: number; type: EntryType } {
  return col === 'nextEstimate' ? { year: year + 1, type: 'estimate' } : { year, type: col }
}

/** « Estimation 2026 », « Réalisation 2026 », « Estimation 2027 ». */
export function columnLabel(year: number, col: AmountColumn): string {
  const target = columnTarget(year, col)
  return `${target.type === 'estimate' ? 'Estimation' : 'Réalisation'} ${target.year}`
}

/** « Comptabilité des sorties » / « des entrées » : titres d'écran, d'impression et d'export. */
export const LEDGER_TITLES: Record<Ledger, string> = {
  expense: 'Comptabilité des sorties',
  income: 'Comptabilité des entrées'
}
