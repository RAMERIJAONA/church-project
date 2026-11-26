import { join } from 'node:path'
import type { Clock } from '@main/adapters/clock.adapter'
import type { DialogAdapter } from '@main/adapters/dialog.adapter'
import type { FsAdapter } from '@main/adapters/fs.adapter'
import { accountingWorksheet } from '@main/export/accounting.xlsx'
import { buildXlsx } from '@main/export/xlsx'
import type { Logger } from '@main/logging/logger'
import {
  exportPeriodLabel,
  periodExportTable,
  yearExportTable,
  type ExportSheetInput,
  type ExportTable
} from '@shared/domain/accounting/accounting.export'
import { AppError } from '@shared/domain/errors'
import type { ExportResultDTO } from '@shared/ipc/contract'
import type { AccountingSummaryService } from './accounting-summary.service'
import type { AccountingService } from './accounting.service'

/** Caractères interdits dans un nom de fichier Windows. */
const safeFileName = (name: string): string => name.replace(/[\\/:*?"<>|]/g, '-').trim()

/** Fichier ouvert dans Excel (verrouillé sous Windows) ou dossier protégé. */
const LOCKED = new Set(['EBUSY', 'EPERM', 'EACCES'])
const errorCode = (err: unknown): unknown =>
  typeof err === 'object' && err !== null && 'code' in err ? err.code : undefined

/**
 * Export Excel du tableau affiché (vue Année ou période), demandé le 2026-11-25 pour les deux
 * comptabilités. Mêmes chiffres qu'à l'écran : calculés depuis le même tableau.
 */
export function createAccountingExportService(deps: {
  accounting: Pick<AccountingService, 'getSheet'>
  summary: Pick<AccountingSummaryService, 'getPeriodTotals'>
  dialog: Pick<DialogAdapter, 'chooseSavePath'>
  fs: Pick<FsAdapter, 'writeFile'>
  documentsDir: string
  clock: Clock
  logger: Logger
}) {
  function tableOf(input: ExportSheetInput): ExportTable {
    if (input.view === 'year') {
      return yearExportTable(deps.accounting.getSheet(input.year, input.ledger))
    }
    const range = { from: input.from, to: input.to }
    // La structure (rubriques, numéros) est la même pour toutes les années
    const sheet = deps.accounting.getSheet(Number(input.from.slice(0, 4)), input.ledger)
    const totals = deps.summary.getPeriodTotals({
      ...range,
      ledger: input.ledger,
      column: input.column
    })
    return periodExportTable(sheet, totals, exportPeriodLabel(input.view, range), input.column)
  }

  return {
    async exportExcel(input: ExportSheetInput): Promise<ExportResultDTO> {
      const table = tableOf(input)
      const path = await deps.dialog.chooseSavePath({
        title: 'Exporter en Excel',
        defaultPath: join(deps.documentsDir, `${safeFileName(table.fileName)}.xlsx`),
        filters: [{ name: 'Classeur Excel', extensions: ['xlsx'] }]
      })
      if (path === null) return { status: 'cancelled' }

      const at = deps.clock()
      const file = buildXlsx(accountingWorksheet(table, at), at)
      try {
        deps.fs.writeFile(path, file)
      } catch (err) {
        const code = errorCode(err)
        if (LOCKED.has(String(code))) {
          throw new AppError(
            'BUSINESS_RULE',
            'Impossible d’enregistrer le fichier : il est peut-être ouvert dans Excel. Fermez-le, puis réessayez.',
            { path, code }
          )
        }
        throw err
      }
      deps.logger.info(
        { path, view: input.view, ledger: input.ledger, rows: table.rows.length },
        'tableau exporté en Excel'
      )
      return { status: 'saved', path }
    }
  }
}

export type AccountingExportService = ReturnType<typeof createAccountingExportService>
