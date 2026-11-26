/** Helpers d'affichage purs de la comptabilité (aucun appel IPC). */
import {
  localDateOf,
  periodLabel,
  periodRange,
  type DateRange,
  type PeriodKind
} from '@shared/domain/accounting/accounting.periods'
import { rollUp, type RollUp } from '@shared/domain/accounting/accounting.totals'
import { formatShortDateTime } from '@shared/utils/dates'
import { AMOUNT_COLUMNS, type AmountColumn } from '@shared/domain/accounting/accounting.columns'
import type {
  AccountingItemDTO,
  AccountingSheetDTO,
  EntryDTO,
  ItemAmountsDTO
} from '@shared/domain/accounting/accounting.types'

// Partagés avec l'export Excel (main) : définis dans shared
export {
  AMOUNT_COLUMNS,
  columnLabel,
  columnTarget,
  LEDGER_TITLES,
  type AmountColumn
} from '@shared/domain/accounting/accounting.columns'

/** Sous-totaux ou total général des 3 colonnes. */
export type ColumnTotals = Record<AmountColumn, number | null>

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

/** Jour local (« AAAA-MM-JJ ») où une saisie a été faite. */
export function entrySavedOn(entry: Pick<EntryDTO, 'createdAt'>): string {
  return localDateOf(new Date(entry.createdAt))
}

/**
 * Ordre d'affichage du détail : la saisie la plus récente en haut (date de saisie, puis ordre
 * d'enregistrement ; demande du porteur, 2026-11-26).
 */
export function newestFirst<T extends Pick<EntryDTO, 'id' | 'createdAt'>>(
  entries: readonly T[]
): T[] {
  return [...entries].sort((a, b) =>
    a.createdAt === b.createdAt ? b.id - a.id : a.createdAt < b.createdAt ? 1 : -1
  )
}

/** Saisies faites entre deux jours locaux, bornes incluses (filtre du détail). */
export function entriesSavedIn<T extends Pick<EntryDTO, 'createdAt'>>(
  entries: readonly T[],
  range: DateRange
): T[] {
  return entries.filter((e) => {
    const day = entrySavedOn(e)
    return range.from <= day && day <= range.to
  })
}

/** Période qui couvre toutes les saisies : du jour de la première à aujourd'hui (ou après). */
export function entriesSavedRange(
  entries: readonly Pick<EntryDTO, 'createdAt'>[],
  today: string
): DateRange {
  const days = entries.map(entrySavedOn).sort()
  const first = days[0] ?? today
  const last = days[days.length - 1] ?? today
  return { from: first < today ? first : today, to: last > today ? last : today }
}
