/** Helpers d'affichage purs de la comptabilité (aucun appel IPC). */
import type {
  AccountingItemDTO,
  AccountingSheetDTO,
  EntryType,
  ItemAmountsDTO
} from '@shared/domain/accounting/accounting.types'

/** Les 3 colonnes de l'année affichée N, dans l'ordre du tableau. */
export const AMOUNT_COLUMNS = ['estimate', 'actual', 'nextEstimate'] as const
export type AmountColumn = (typeof AMOUNT_COLUMNS)[number]

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
