/**
 * Contenu d'un export Excel de la comptabilité (demande du porteur, 2026-11-25) : le tableau
 * affiché à l'écran, rubrique par rubrique, avec sous-totaux et total. Fonctions pures : le
 * fichier lui-même est écrit par le main (main/export).
 */
import { z } from 'zod'
import { AMOUNT_COLUMNS, columnLabel, LEDGER_TITLES, type AmountColumn } from './accounting.columns'
import { periodLabel, rangeLabel, type DateRange, type PeriodKind } from './accounting.periods'
import { rollUp } from './accounting.totals'
import {
  amountColumnSchema,
  ledgerSchema,
  operationDateSchema,
  yearSchema,
  type AccountingItemDTO,
  type AccountingSheetDTO,
  type ItemLevel,
  type Ledger,
  type PeriodTotalDTO
} from './accounting.types'
import { CHURCH_NAME } from '@shared/domain/identity'

/** Vue exportée : l'année (3 colonnes) ou une période (colonne choisie), comme à l'écran. */
export const exportSheetInputSchema = z.union([
  z.object({ view: z.literal('year'), ledger: ledgerSchema, year: yearSchema }).strict(),
  z
    .object({
      view: z.enum(['day', 'week', 'month', 'custom']),
      ledger: ledgerSchema,
      from: operationDateSchema,
      to: operationDateSchema,
      column: amountColumnSchema
    })
    .strict()
    .refine((r) => r.from <= r.to, 'Période invalide : la date de début suit la date de fin')
])
export type ExportSheetInput = z.infer<typeof exportSheetInputSchema>
export type ExportPeriodView = PeriodKind | 'custom'

/** `root` : niveau 1 ; `group` : a des sous-rubriques (sous-total) ; `leaf` : porte des montants. */
export type ExportRowKind = 'root' | 'group' | 'leaf'

export interface ExportRow {
  code: string
  description: string
  level: ItemLevel
  kind: ExportRowKind
  /** Un montant par colonne ; `null` : case vide */
  values: (number | null)[]
}

export interface ExportTable {
  /** « FJKM … : comptabilité des sorties » */
  title: string
  /** « Année 2026 », « Réalisations : Novembre 2026 » */
  subtitle: string
  /** « Comptabilité des sorties - Année 2026 » (nom du fichier proposé, sans extension) */
  fileName: string
  /** En-têtes des colonnes de montants */
  columns: string[]
  rows: ExportRow[]
  /** Ligne de total, une valeur par colonne */
  total: { label: string; values: (number | null)[] }
}

const kindOf = (item: AccountingItemDTO): ExportRowKind =>
  item.level === 1 ? 'root' : item.amounts === null ? 'group' : 'leaf'

/** Ordre d'affichage du tableau : profondeur d'abord. */
function flatten(items: readonly AccountingItemDTO[]): AccountingItemDTO[] {
  return items.flatMap((item) => [item, ...flatten(item.children)])
}

function heading(
  ledger: Ledger,
  subtitle: string,
  fileLabel: string
): {
  title: string
  subtitle: string
  fileName: string
} {
  return {
    title: `${CHURCH_NAME} : ${LEDGER_TITLES[ledger].toLowerCase()}`,
    subtitle,
    fileName: `${LEDGER_TITLES[ledger]} - ${fileLabel}`
  }
}

/** Vue Année : Estimation N, Réalisation N, Estimation N+1, sous-totaux et total général. */
export function yearExportTable(sheet: AccountingSheetDTO): ExportTable {
  const sums = AMOUNT_COLUMNS.map((col) =>
    rollUp(sheet.items, (item) => item.amounts?.[col].total ?? null)
  )
  const subtitle = `Année ${sheet.year}`
  return {
    ...heading(sheet.ledger, subtitle, subtitle),
    columns: AMOUNT_COLUMNS.map((col) => columnLabel(sheet.year, col)),
    rows: flatten(sheet.items).map((item) => ({
      code: item.code,
      description: item.description,
      level: item.level,
      kind: kindOf(item),
      values: sums.map((s) => s.byItem.get(item.id) ?? null)
    })),
    total: { label: 'Total général', values: sums.map((s) => s.grand) }
  }
}

/** Titre d'une période, comme à l'écran : « Novembre 2026 », « Du 3 au 24 novembre 2026 »… */
export function exportPeriodLabel(view: ExportPeriodView, range: DateRange): string {
  return view === 'custom' ? rangeLabel(range) : periodLabel(view, range)
}

/** Titre d'une vue par période : « Réalisation 2026 : Novembre 2026 ». */
export function periodTitle(year: number, column: AmountColumn, label: string): string {
  return `${columnLabel(year, column)} : ${label}`
}

/**
 * Vues par période : une colonne, celle choisie (Estimation N, Réalisation N ou Estimation N+1),
 * somme des saisies faites pendant la période.
 */
export function periodExportTable(
  sheet: AccountingSheetDTO,
  totals: readonly PeriodTotalDTO[],
  label: string,
  column: AmountColumn
): ExportTable {
  const columnTitle = columnLabel(sheet.year, column)
  const totalById = new Map(totals.map((t) => [t.itemId, t.total]))
  const sums = rollUp(sheet.items, (item) =>
    item.amounts ? (totalById.get(item.id) ?? null) : null
  )
  return {
    ...heading(sheet.ledger, periodTitle(sheet.year, column, label), `${columnTitle} - ${label}`),
    columns: [columnTitle],
    rows: flatten(sheet.items).map((item) => ({
      code: item.code,
      description: item.description,
      level: item.level,
      kind: kindOf(item),
      values: [sums.byItem.get(item.id) ?? null]
    })),
    total: { label: 'Total', values: [sums.grand] }
  }
}
