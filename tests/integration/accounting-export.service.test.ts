import { describe, expect, it } from 'vitest'
import type { DialogAdapter } from '@main/adapters/dialog.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createAccountingExportService } from '@main/services/accounting-export.service'
import { AppError } from '@shared/domain/errors'
import { makeChildInput, makeRootInput } from '@tests/factories/accounting.factory'
import { D, setupAccounting, YEAR } from '@tests/helpers/accounting-context'
import { unzip } from '@tests/helpers/unzip'

function setup({ savePath = '/Documents/compta.xlsx' as string | null, failWith = '' } = {}) {
  const ctx = setupAccounting()
  const written = new Map<string, Buffer>()
  const requests: Array<Parameters<DialogAdapter['chooseSavePath']>[0]> = []
  const exporter = createAccountingExportService({
    accounting: ctx.service,
    dialog: {
      chooseSavePath: async (options) => {
        requests.push(options)
        return savePath
      }
    },
    fs: {
      writeFile: (path, data) => {
        if (failWith) throw Object.assign(new Error(failWith), { code: failWith })
        written.set(path, Buffer.from(data))
      }
    },
    documentsDir: '/Documents',
    clock: ctx.clock,
    logger: createLogger(createMemorySink())
  })
  /** A1 ASA > {A1-1 Mpitandrina, A1-2 Karama} */
  const plan = () => {
    const a1 = ctx.service.createItem(makeRootInput({ prefix: 'A', description: 'asa' }))
    const one = ctx.service.createItem(
      makeChildInput({ parentId: a1.id, description: 'Mpitandrina' })
    )
    const two = ctx.service.createItem(makeChildInput({ parentId: a1.id, description: 'Karama' }))
    ctx.service.setTotal({ itemId: one.id, year: YEAR, type: 'estimate', amount: 2_000_000 })
    ctx.service.setTotal({ itemId: one.id, year: YEAR, type: 'actual', amount: 1_500_000 })
    ctx.service.setTotal({ itemId: two.id, year: YEAR, type: 'actual', amount: 250_000 })
    ctx.service.setTotal({ itemId: two.id, year: YEAR + 1, type: 'estimate', amount: 300_000 })
    return { a1, one, two }
  }
  const sheetXml = (path = '/Documents/compta.xlsx'): string => {
    const file = written.get(path)
    if (!file) throw new Error(`aucun fichier écrit à ${path}`)
    return unzip(file).get('xl/worksheets/sheet1.xml') ?? ''
  }
  return { ...ctx, exporter, written, requests, plan, sheetXml }
}

/** Valeurs numériques de la ligne `row` de la feuille, dans l'ordre des colonnes. */
const numbersOfRow = (xml: string, row: number): number[] => {
  const content = new RegExp(`<row r="${row}">(.*?)</row>`).exec(xml)?.[1] ?? ''
  return [...content.matchAll(/<v>(\d+)<\/v>/g)].map((m) => Number(m[1]))
}

describe('export Excel de la comptabilité', () => {
  it('vue Année : fichier proposé dans Documents, rubriques, sous-totaux et total', async () => {
    const t = setup()
    t.plan()
    expect(await t.exporter.exportExcel({ view: 'year', ledger: 'expense', year: YEAR })).toEqual({
      status: 'saved',
      path: '/Documents/compta.xlsx'
    })
    expect(t.requests[0]).toMatchObject({
      defaultPath: '/Documents/Comptabilité des sorties - Année 2026.xlsx',
      filters: [{ name: 'Classeur Excel', extensions: ['xlsx'] }]
    })

    const xml = t.sheetXml()
    expect(xml).toContain('>Estimation 2026<')
    expect(xml).toContain('>Réalisation 2026<')
    expect(xml).toContain('>Estimation 2027<')
    // Ligne 5 : A1 (sous-total) ; 6 : A1-1 ; 7 : A1-2 ; 8 : total général
    expect(xml).toContain('>ASA<')
    expect(numbersOfRow(xml, 5)).toEqual([2_000_000, 1_750_000, 300_000])
    expect(numbersOfRow(xml, 6)).toEqual([2_000_000, 1_500_000])
    expect(numbersOfRow(xml, 7)).toEqual([250_000, 300_000])
    expect(xml).toContain('>Total général<')
    expect(numbersOfRow(xml, 8)).toEqual([2_000_000, 1_750_000, 300_000])
  })

  it('vue par période : réalisations dont la date d’opération tombe dans la période', async () => {
    const t = setup()
    t.plan()
    const result = await t.exporter.exportExcel({
      view: 'month',
      ledger: 'expense',
      from: '2026-11-01',
      to: '2026-11-30'
    })
    expect(result.status).toBe('saved')
    expect(t.requests[0]?.defaultPath).toBe(
      '/Documents/Comptabilité des sorties - Novembre 2026.xlsx'
    )
    const xml = t.sheetXml()
    expect(xml).toContain('>Réalisations : Novembre 2026 · Exporté le ')
    expect(numbersOfRow(xml, 5)).toEqual([1_750_000])
    expect(numbersOfRow(xml, 8)).toEqual([1_750_000])

    // Une autre période (hors de la date des saisies, ${D}) : cases vides
    await t.exporter.exportExcel({
      view: 'day',
      ledger: 'expense',
      from: '2026-11-02',
      to: '2026-11-02'
    })
    expect(numbersOfRow(t.sheetXml(), 5)).toEqual([])
    expect(D).toBe('2026-11-24')
  })

  it('comptabilité des entrées : seulement ses rubriques (A2…)', async () => {
    const t = setup()
    t.plan() // sorties
    t.service.createItem({ parentId: null, prefix: 'A', ledger: 'income', description: 'rakitra' })
    await t.exporter.exportExcel({ view: 'year', ledger: 'income', year: YEAR })
    expect(t.requests[0]?.defaultPath).toBe('/Documents/Comptabilité des entrées - Année 2026.xlsx')
    const xml = t.sheetXml()
    expect(xml).toContain('>A2<')
    expect(xml).toContain('>RAKITRA<')
    expect(xml).not.toContain('>ASA<')
  })

  it('n’écrit rien si l’enregistrement est annulé', async () => {
    const t = setup({ savePath: null })
    t.plan()
    expect(await t.exporter.exportExcel({ view: 'year', ledger: 'expense', year: YEAR })).toEqual({
      status: 'cancelled'
    })
    expect(t.written.size).toBe(0)
  })

  it('fichier ouvert dans Excel (verrouillé) : message clair, code BUSINESS_RULE', async () => {
    const t = setup({ failWith: 'EBUSY' })
    t.plan()
    const run = t.exporter.exportExcel({ view: 'year', ledger: 'expense', year: YEAR })
    await expect(run).rejects.toBeInstanceOf(AppError)
    await expect(run).rejects.toMatchObject({
      code: 'BUSINESS_RULE',
      message: expect.stringContaining('ouvert dans Excel')
    })
  })

  it('autre erreur d’écriture : relancée telle quelle (journalisée en INTERNAL par l’IPC)', async () => {
    const t = setup({ failWith: 'ENOSPC' })
    await expect(
      t.exporter.exportExcel({ view: 'year', ledger: 'expense', year: YEAR })
    ).rejects.toMatchObject({ code: 'ENOSPC' })
  })
})
