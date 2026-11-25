/** Helpers d'affichage purs de la comptabilité (aucun appel IPC). */
import {
  periodLabel,
  periodRange,
  type DateRange,
  type PeriodKind
} from '@shared/domain/accounting/accounting.periods'
import { rollUp, type RollUp } from '@shared/domain/accounting/accounting.totals'
import { formatShortDateTime } from '@shared/utils/dates'
import type {
  AccountingItemDTO,
  AccountingSheetDTO,
  EntryType,
  ItemAmountsDTO,
  PeriodTotalDTO
} from '@shared/domain/accounting/accounting.types'

/** Les 3 colonnes de l'année affichée N, dans l'ordre du tableau. */
export const AMOUNT_COLUMNS = ['estimate', 'actual', 'nextEstimate'] as const
export type AmountColumn = (typeof AMOUNT_COLUMNS)[number]

/** Sous-totaux ou total général des 3 colonnes. */
export type ColumnTotals = Record<AmountColumn, number | null>

/** Année et type réellement écrits par une colonne (Estimation N+1 = estimation de N+1). */
export function columnTarget(year: number, col: AmountColumn): { year: number; type: EntryType } {
  return col === 'nextEstimate' ? { year: year + 1, type: 'estimate' } : { year, type: col }
}

export function columnLabel(year: number, col: AmountColumn): string {
  const target = columnTarget(year, col)
  return `${target.type === 'estimate' ? 'Estimation' : 'Réalisation'} ${target.year}`
}

export interface FlatRow {
  item: AccountingItemDTO
}

/** Ordre d'affichage du tableau : profondeur d'abord. */
export function flattenTree(items: readonly AccountingItemDTO[]): FlatRow[] {
  const out: FlatRow[] = []
  const walk = (siblings: readonly AccountingItemDTO[]): void => {
    for (const item of siblings) {
      out.push({ item })
      walk(item.children)
    }
  }
  walk(items)
  return out
}

/** Copie du tableau où la case (`itemId`, `col`) devient un total direct (ou vide). */
export function withTotal(
  sheet: AccountingSheetDTO,
  itemId: number,
  col: AmountColumn,
  amount: number | null
): AccountingSheetDTO {
  const update = (items: AccountingItemDTO[]): AccountingItemDTO[] =>
    items.map((item) => {
      if (item.id === itemId && item.amounts) {
        const amounts: ItemAmountsDTO = {
          ...item.amounts,
          [col]: {
            total: amount,
            entryCount: amount === null ? 0 : 1,
            detailed: false,
            // Mise à jour optimiste : heure locale, remplacée par celle du service au rechargement
            lastEntryAt: amount === null ? null : new Date().toISOString()
          }
        }
        return { ...item, amounts }
      }
      return item.children.length > 0 ? { ...item, children: update(item.children) } : item
    })
  return { ...sheet, items: update(sheet.items) }
}

/**
 * Date affichée sous un montant : date et heure de la dernière saisie (« 25/11/2026 14:32 »).
 * Saisie faite après la fin de l'année de la case (ex. réalisation 2025 saisie en 2026) :
 * l'année seule (« 2025 »), demande du porteur (2026-11-25).
 */
export function entryDateLabel(lastEntryAt: string, cellYear: number): string {
  const at = new Date(lastEntryAt)
  return at.getFullYear() > cellYear ? String(cellYear) : formatShortDateTime(at)
}

/** Vue du tableau : l'année (3 colonnes, modifiable) ou une période de réalisations. */
export type AccountingView = 'year' | 'month' | 'week' | 'day' | 'custom'

export const VIEW_LABELS: Record<AccountingView, string> = {
  year: 'Année',
  month: 'Mois',
  week: 'Semaine',
  day: 'Jour',
  custom: 'Personnalisé'
}

/** Sous-totaux de chaque élément et total général, pour les 3 colonnes de l'année. */
export function sheetTotals(items: readonly AccountingItemDTO[]): {
  byItem: Map<number, ColumnTotals>
  grand: ColumnTotals
} {
  const [estimate, actual, nextEstimate] = AMOUNT_COLUMNS.map((col) =>
    rollUp(items, (item) => item.amounts?.[col].total ?? null)
  ) as [RollUp, RollUp, RollUp]
  const byItem = new Map<number, ColumnTotals>()
  for (const id of estimate.byItem.keys()) {
    byItem.set(id, {
      estimate: estimate.byItem.get(id) ?? null,
      actual: actual.byItem.get(id) ?? null,
      nextEstimate: nextEstimate.byItem.get(id) ?? null
    })
  }
  return {
    byItem,
    grand: { estimate: estimate.grand, actual: actual.grand, nextEstimate: nextEstimate.grand }
  }
}

/** Carte de la synthèse : total des réalisations d'une période qui contient aujourd'hui. */
export interface SummaryPeriod {
  kind: PeriodKind | 'year'
  /** « Aujourd'hui », « Cette semaine »… */
  title: string
  /** « Mercredi 25 novembre 2026 », « Semaine du 23 au 29 novembre 2026 »… */
  caption: string
  range: DateRange
}

const SUMMARY_TITLES: Record<SummaryPeriod['kind'], string> = {
  day: 'Aujourd’hui',
  week: 'Cette semaine',
  month: 'Ce mois',
  year: 'Cette année'
}

/** Jour, semaine, mois et année en cours (`today` : « AAAA-MM-JJ », date locale). */
export function summaryPeriods(today: string): SummaryPeriod[] {
  const year = today.slice(0, 4)
  const kinds: PeriodKind[] = ['day', 'week', 'month']
  return [
    ...kinds.map((kind) => {
      const range = periodRange(kind, today)
      return { kind, title: SUMMARY_TITLES[kind], caption: periodLabel(kind, range), range }
    }),
    {
      kind: 'year' as const,
      title: SUMMARY_TITLES.year,
      caption: `Année ${year}`,
      range: { from: `${year}-01-01`, to: `${year}-12-31` }
    }
  ]
}

/** Total des réalisations d'une période (toutes rubriques), `null` si aucune saisie. */
export function sumPeriodTotals(totals: readonly PeriodTotalDTO[]): number | null {
  return totals.length === 0 ? null : totals.reduce((sum, t) => sum + t.total, 0)
}
