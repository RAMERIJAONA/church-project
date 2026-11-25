/**
 * Bug (2026-11-24) : sur un poste sans aucune imprimante installée, « Imprimer » échouait avec
 * « Impression impossible : No printers available on the network » (Chromium n'ouvre pas sa
 * boîte d'impression sans imprimante) et l'utilisateur voyait « Erreur inattendue ».
 * Attendu : sans imprimante, proposer d'enregistrer le tableau en PDF.
 */
import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import type { DialogAdapter } from '@main/adapters/dialog.adapter'
import type { PrintAdapter } from '@main/adapters/print.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createPrintService } from '@main/services/print.service'

function setup({ printers, savePath }: { printers: boolean; savePath: string | null }) {
  const calls: string[] = []
  const saveRequests: Array<Parameters<DialogAdapter['chooseSavePath']>[0]> = []
  const printer: PrintAdapter = {
    hasPrinters: async () => printers,
    print: async () => {
      calls.push('print')
      return 'printed'
    },
    savePdf: async (path) => {
      calls.push(`pdf:${path}`)
    }
  }
  const dialog: Pick<DialogAdapter, 'chooseSavePath'> = {
    chooseSavePath: async (options) => {
      saveRequests.push(options)
      return savePath
    }
  }
  const service = createPrintService({
    printer,
    dialog,
    documentsDir: '/Documents',
    clock: createFixedClock(new Date('2026-11-24T09:00:00.000Z')),
    logger: createLogger(createMemorySink())
  })
  return { service, calls, saveRequests }
}

describe('régression : impression sans imprimante installée', () => {
  it('propose d’enregistrer le tableau en PDF', async () => {
    const { service, calls, saveRequests } = setup({
      printers: false,
      savePath: '/Documents/compta.pdf'
    })
    expect(await service.print()).toEqual({ status: 'saved', path: '/Documents/compta.pdf' })
    expect(calls).toEqual(['pdf:/Documents/compta.pdf'])
    expect(saveRequests[0]).toMatchObject({
      defaultPath: '/Documents/Comptabilité 2026-11-24.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
  })

  it('n’écrit rien si l’enregistrement est annulé', async () => {
    const { service, calls } = setup({ printers: false, savePath: null })
    expect(await service.print()).toEqual({ status: 'cancelled' })
    expect(calls).toEqual([])
  })

  it('imprime normalement quand une imprimante existe', async () => {
    const { service, calls, saveRequests } = setup({ printers: true, savePath: null })
    expect(await service.print()).toEqual({ status: 'printed' })
    expect(calls).toEqual(['print'])
    expect(saveRequests).toEqual([])
  })
})
