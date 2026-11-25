import { describe, expect, it } from 'vitest'
import { CHURCH_NAME } from '@shared/domain/identity'
import {
  exportPeriodLabel,
  exportSheetInputSchema,
  periodExportTable,
  yearExportTable
} from './accounting.export'
import { buildSheet, type EntryRow, type ItemRow } from './accounting.tree'

const AT = '2026-11-24T09:00:00.000Z'
const items: ItemRow[] = [
  { id: 1, parentId: null, prefix: 'A', position: 1, description: 'ASA' },
  { id: 2, parentId: 1, prefix: null, position: 1, description: 'Mpitandrina' },
  { id: 3, parentId: 1, prefix: null, position: 2, description: 'Karama' },
  { id: 4, parentId: null, prefix: 'B', position: 1, description: 'TRANO' }
]
const entry = (o: Omit<EntryRow, 'label' | 'updatedAt'>): EntryRow => ({
  label: null,
  updatedAt: AT,
  ...o
})
const entries: EntryRow[] = [
  entry({ itemId: 2, year: 2026, type: 'estimate', amount: 1000 }),
  entry({ itemId: 2, year: 2026, type: 'actual', amount: 400 }),
  entry({ itemId: 3, year: 2026, type: 'actual', amount: 600 }),
  entry({ itemId: 4, year: 2027, type: 'estimate', amount: 50 })
]
const sheet = buildSheet(2026, items, entries, new Set([2, 3, 4]))

describe('export Excel : contenu du tableau', () => {
  it('vue Année : 3 colonnes, une ligne par rubrique, sous-totaux et total général', () => {
    const table = yearExportTable(sheet)
    expect(table.title).toBe(`${CHURCH_NAME} : comptabilité des sorties`)
    expect(table.subtitle).toBe('Année 2026')
    expect(table.fileName).toBe('Comptabilité des sorties - Année 2026')
    expect(table.columns).toEqual(['Estimation 2026', 'Réalisation 2026', 'Estimation 2027'])
    expect(table.rows.map((r) => [r.code, r.kind, r.level, r.values])).toEqual([
      ['A1', 'root', 1, [1000, 1000, null]],
      ['A1-1', 'leaf', 2, [1000, 400, null]],
      ['A1-2', 'leaf', 2, [null, 600, null]],
      ['B1', 'root', 1, [null, null, 50]]
    ])
    expect(table.rows[1]?.description).toBe('Mpitandrina')
    expect(table.total).toEqual({ label: 'Total général', values: [1000, 1000, 50] })
  })

  it('comptabilité des entrées : titre et nom de fichier des entrées', () => {
    const income = buildSheet(2026, items, [], new Set(), 'income')
    const table = yearExportTable(income)
    expect(table.title).toBe(`${CHURCH_NAME} : comptabilité des entrées`)
    expect(table.fileName).toBe('Comptabilité des entrées - Année 2026')
    expect(table.rows[0]?.code).toBe('A2')
    expect(table.total.values).toEqual([null, null, null])
  })

  it('vue par période : une colonne « Réalisations », cases vides sans réalisation', () => {
    const table = periodExportTable(
      sheet,
      [{ itemId: 2, total: 400, entryCount: 1 }],
      'Novembre 2026'
    )
    expect(table.subtitle).toBe('Réalisations : Novembre 2026')
    expect(table.fileName).toBe('Comptabilité des sorties - Novembre 2026')
    expect(table.columns).toEqual(['Réalisations'])
    expect(table.rows.map((r) => [r.code, r.values])).toEqual([
      ['A1', [400]],
      ['A1-1', [400]],
      ['A1-2', [null]],
      ['B1', [null]]
    ])
    expect(table.total).toEqual({ label: 'Total', values: [400] })
  })

  it('titre de la période comme à l’écran', () => {
    expect(exportPeriodLabel('month', { from: '2026-11-01', to: '2026-11-30' })).toBe(
      'Novembre 2026'
    )
    expect(exportPeriodLabel('custom', { from: '2026-11-03', to: '2026-11-24' })).toBe(
      'Du 3 au 24 novembre 2026'
    )
  })

  it('contrat : vue Année ou période valide', () => {
    expect(
      exportSheetInputSchema.safeParse({ view: 'year', ledger: 'income', year: 2026 }).success
    ).toBe(true)
    const period = { view: 'week', ledger: 'expense', from: '2026-11-23', to: '2026-11-29' }
    expect(exportSheetInputSchema.safeParse(period).success).toBe(true)
    expect(exportSheetInputSchema.safeParse({ ...period, from: '2026-11-30' }).success).toBe(false)
    expect(exportSheetInputSchema.safeParse({ view: 'year', ledger: 'expense' }).success).toBe(
      false
    )
  })
})
