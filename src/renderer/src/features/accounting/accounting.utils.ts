/** Helpers d'affichage purs de la comptabilité (aucun appel IPC). */
import { rollUp, type RollUp } from '@shared/domain/accounting/accounting.totals'
import { formatLongDate } from '@shared/utils/dates'
import type {
  AccountingItemDTO,
  AccountingSheetDTO,
  EntryType,
  ItemAmountsDTO
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
  /** Premier / dernier parmi ses frères (même parent ; au niveau 1 : même lettre) */
  isFirst: boolean
  isLast: boolean
}

/** Ordre d'affichage du tableau : profondeur d'abord. */
export function flattenTree(items: readonly AccountingItemDTO[]): FlatRow[] {
  const out: FlatRow[] = []
  const walk = (siblings: readonly AccountingItemDTO[]): void => {
    siblings.forEach((item, i) => {
      const prev = siblings[i - 1]
      const next = siblings[i + 1]
      out.push({
        item,
        isFirst: !prev || prev.prefix !== item.prefix,
        isLast: !next || next.prefix !== item.prefix
      })
      walk(item.children)
    })
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
          [col]: { total: amount, entryCount: amount === null ? 0 : 1, detailed: false }
        }
        return { ...item, amounts }
      }
      return item.children.length > 0 ? { ...item, children: update(item.children) } : item
    })
  return { ...sheet, items: update(sheet.items) }
}

/** « 2026-11-22 » → « dimanche 22 novembre 2026 » (date du calendrier, sans fuseau). */
export function operationDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return formatLongDate(new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, 12))
}

/** Vue du tableau : l'année (3 colonnes, modifiable) ou une période de réalisations. */
export type AccountingView = 'year' | 'month' | 'week' | 'day'

export const VIEW_LABELS: Record<AccountingView, string> = {
  year: 'Année',
  month: 'Mois',
  week: 'Semaine',
  day: 'Jour'
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
