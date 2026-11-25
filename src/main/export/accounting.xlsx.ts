/**
 * Mise en forme Excel du tableau de comptabilité exporté (cf. shared/domain/accounting/
 * accounting.export.ts) : en-tête, une ligne par rubrique, total. Montants en nombres (Excel
 * peut recalculer), affichés « 2 000 000 Ar ».
 */
import type { ExportRow, ExportTable } from '@shared/domain/accounting/accounting.export'
import { formatDateTime } from '@shared/utils/dates'
import type { CellStyle, XlsxCell, XlsxSheet } from './xlsx'

const DESCRIPTION_STYLE: Record<ExportRow['level'], CellStyle> = {
  1: 'descriptionBold',
  2: 'indent1',
  3: 'indent2',
  4: 'indent3'
}

/** Lignes 1 à 3 : titre, vue et date d'export, ligne vide ; ligne 4 : en-têtes des colonnes. */
export const HEADER_ROWS = 4

function rowCells(row: ExportRow): XlsxCell[] {
  const bold = row.kind !== 'leaf'
  return [
    { value: row.code, style: row.kind === 'root' ? 'bold' : 'text' },
    { value: row.description, style: DESCRIPTION_STYLE[row.level] },
    ...row.values.map((value): XlsxCell => ({ value, style: bold ? 'amountBold' : 'amount' }))
  ]
}

export function accountingWorksheet(table: ExportTable, exportedAt: Date): XlsxSheet {
  return {
    name: 'Comptabilité',
    columnWidths: [16, 60, ...table.columns.map(() => 22)],
    headerRows: HEADER_ROWS,
    rows: [
      [{ value: table.title, style: 'title' }],
      [{ value: `${table.subtitle} · Exporté le ${formatDateTime(exportedAt)}` }],
      [],
      [
        { value: 'N°', style: 'header' },
        { value: 'Description', style: 'header' },
        ...table.columns.map((c): XlsxCell => ({ value: c, style: 'headerAmount' }))
      ],
      ...table.rows.map(rowCells),
      [
        { value: table.total.label, style: 'bold' },
        { value: null },
        ...table.total.values.map((value): XlsxCell => ({ value, style: 'amountBold' }))
      ]
    ]
  }
}
