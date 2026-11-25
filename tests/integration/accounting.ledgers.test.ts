/**
 * Deux comptabilités (2026-11-25) : sorties (A1, B1…) et entrées (A2, B2…). Mêmes règles ;
 * lettres, numéros, montants et totaux par période indépendants.
 */
import { describe, expect, it } from 'vitest'
import { ipcInputs } from '@shared/ipc/contract'
import { D, cell, setupAccounting } from '@tests/helpers/accounting-context'

const codesOf = (items: Array<{ code: string; children: unknown[] }>): string[] =>
  items.flatMap((i) => [i.code, ...codesOf(i.children as typeof items)])

describe('AccountingService : comptabilités des sorties et des entrées', () => {
  it('numérote les entrées à partir de 2, sous-rubriques comprises', () => {
    const { service } = setupAccounting()
    const a2 = service.createItem({
      parentId: null,
      ledger: 'income',
      prefix: 'A',
      description: 'x'
    })
    const leaf = service.createItem({ parentId: a2.id, description: 'Rakitra' })
    const group = service.createItem({ parentId: a2.id, description: 'Fanomezana' })
    service.createItem({ parentId: group.id, description: 'Fianakaviana' })
    service.createItem({ parentId: null, ledger: 'income', prefix: 'A', description: 'y' })
    service.createItem({ parentId: null, ledger: 'income', prefix: 'B', description: 'z' })
    expect(a2.code).toBe('A2')
    expect(leaf.code).toBe('A2-1')
    expect(codesOf(service.getSheet(2026, 'income').items)).toEqual([
      'A2',
      'A2-1',
      'A2-I',
      'A2-I-1',
      'A3',
      'B2'
    ])
  })

  it('sépare les rubriques, les lettres et les montants des deux comptabilités', () => {
    const { service } = setupAccounting()
    const out = service.createItem({
      parentId: null,
      ledger: 'expense',
      prefix: 'A',
      description: 'o'
    })
    const inc = service.createItem({
      parentId: null,
      ledger: 'income',
      prefix: 'A',
      description: 'i'
    })
    // Chaque comptabilité commence à A : B n'est pas encore utilisable dans les entrées seules
    service.createItem({ parentId: null, ledger: 'expense', prefix: 'B', description: 'o2' })
    expect(service.getSheet(2026, 'expense').items.map((i) => i.code)).toEqual(['A1', 'B1'])
    expect(service.getSheet(2026, 'income').items.map((i) => i.code)).toEqual(['A2'])

    service.addEntry({ ...cell, itemId: out.id, amount: 100, label: null, operatedOn: D })
    service.addEntry({ ...cell, itemId: inc.id, amount: 700, label: null, operatedOn: D })
    expect(service.getSheet(2026, 'income').items[0]?.amounts?.actual.total).toBe(700)
    const range = { from: D, to: D }
    expect(service.getPeriodTotals({ ...range, ledger: 'income' })).toEqual([
      { itemId: inc.id, total: 700, entryCount: 1 }
    ])
    expect(service.getPeriodTotals({ ...range, ledger: 'expense' })).toEqual([
      { itemId: out.id, total: 100, entryCount: 1 }
    ])
  })

  it('une sous-rubrique hérite de la comptabilité de son parent ; suppression sans effet sur l’autre', () => {
    const { service } = setupAccounting()
    const inc = service.createItem({
      parentId: null,
      ledger: 'income',
      prefix: 'A',
      description: 'i'
    })
    service.createItem({ parentId: inc.id, description: 'Rakitra' })
    const out = service.createItem({
      parentId: null,
      ledger: 'expense',
      prefix: 'A',
      description: 'o'
    })
    expect(codesOf(service.getSheet(2026, 'income').items)).toEqual(['A2', 'A2-1'])
    service.deleteItem(out.id)
    expect(codesOf(service.getSheet(2026, 'income').items)).toEqual(['A2', 'A2-1'])
    expect(service.getSheet(2026, 'expense').items).toEqual([])
  })

  it('contrat IPC : la comptabilité est obligatoire au niveau 1 et interdite en dessous', () => {
    const input = ipcInputs['accounting.createItem']
    expect(input.safeParse({ parentId: null, prefix: 'A', description: 'x' }).success).toBe(false)
    expect(
      input.safeParse({ parentId: null, prefix: 'A', ledger: 'income', description: 'x' }).success
    ).toBe(true)
    expect(input.safeParse({ parentId: 1, ledger: 'income', description: 'x' }).success).toBe(false)
    expect(ipcInputs['accounting.sheet'].safeParse({ year: 2026 }).success).toBe(false)
  })
})
