import { join } from 'node:path'
import type { Clock } from '@main/adapters/clock.adapter'
import type { DialogAdapter } from '@main/adapters/dialog.adapter'
import type { PrintAdapter } from '@main/adapters/print.adapter'
import type { Logger } from '@main/logging/logger'
import { localDateOf } from '@shared/domain/accounting/accounting.periods'
import type { PrintResultDTO } from '@shared/ipc/contract'

/**
 * Impression du tableau affiché. Sans imprimante installée, Chromium refuse d'imprimer : on
 * propose alors d'enregistrer la même page en PDF (régression du 2026-11-24).
 */
export function createPrintService(deps: {
  printer: PrintAdapter
  dialog: Pick<DialogAdapter, 'chooseSavePath'>
  documentsDir: string
  clock: Clock
  logger: Logger
}) {
  return {
    async print(): Promise<PrintResultDTO> {
      if (await deps.printer.hasPrinters()) return { status: await deps.printer.print() }

      deps.logger.info({}, 'aucune imprimante : enregistrement en PDF proposé')
      const path = await deps.dialog.chooseSavePath({
        title: 'Aucune imprimante : enregistrer en PDF',
        defaultPath: join(deps.documentsDir, `Comptabilité ${localDateOf(deps.clock())}.pdf`),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      })
      if (path === null) return { status: 'cancelled' }
      await deps.printer.savePdf(path)
      deps.logger.info({ path }, 'tableau enregistré en PDF')
      return { status: 'saved', path }
    }
  }
}

export type PrintService = ReturnType<typeof createPrintService>
