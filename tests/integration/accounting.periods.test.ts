/** Date d'opération des réalisations et totaux par période (jour, semaine, mois). */
import { describe, expect, it } from 'vitest'
import {
  cell,
  D,
  expectAppError,
  setupAccounting as setup,
  YEAR
} from '@tests/helpers/accounting-context'

describe('AccountingService : date d’opération et périodes', () => {
  it('date un total direct de réalisation au jour, ramené dans l’année, et garde sa date', () => {
    const { church, service, clock } = setup()
    const { i1 } = church()
    service.setTotal({ ...cell, itemId: i1.id, amount: 1 })
    service.setTotal({ itemId: i1.id, year: 2025, type: 'actual', amount: 2 })
    service.setTotal({ itemId: i1.id, year: 2026, type: 'estimate', amount: 3 })
    clock.set(new Date('2026-12-02T09:00:00.000Z'))
    service.setTotal({ ...cell, itemId: i1.id, amount: 4 })
    const dates = (year: number, type: 'actual' | 'estimate') =>
      service.listEntries({ itemId: i1.id, year, type }).map((e) => [e.amount, e.operatedOn])
    expect(dates(2026, 'actual')).toEqual([[4, D]])
    expect(dates(2025, 'actual')).toEqual([[2, '2025-12-31']])
    expect(dates(2026, 'estimate')).toEqual([[3, null]])
  })

  // Demande du porteur (2026-11-25) : l'UI n'envoie plus de date, le service la fixe
  it('date automatiquement une saisie du détail et garde sa date à la modification', () => {
    const { church, service, clock } = setup()
    const { a } = church()
    const added = (year: number, type: 'actual' | 'estimate') =>
      service.addEntry({ itemId: a.id, year, type, amount: 1, label: 'X' }).id
    const now = added(YEAR, 'actual')
    const past = added(2025, 'actual')
    const estimate = added(YEAR, 'estimate')
    clock.set(new Date('2026-12-02T09:00:00.000Z'))
    service.updateEntry({ id: now, amount: 5, label: 'Y' })
    const dateOf = (year: number, type: 'actual' | 'estimate', id: number) =>
      service.listEntries({ itemId: a.id, year, type }).find((e) => e.id === id)?.operatedOn
    expect(dateOf(YEAR, 'actual', now)).toBe(D)
    expect(dateOf(2025, 'actual', past)).toBe('2025-12-31')
    expect(dateOf(YEAR, 'estimate', estimate)).toBeNull()
  })

  it('exige une date d’opération dans l’année pour une réalisation, aucune pour une estimation', () => {
    const { church, service } = setup()
    const { a } = church()
    const add = (type: 'actual' | 'estimate', operatedOn: string | null) => () =>
      service.addEntry({ itemId: a.id, year: YEAR, type, amount: 1, label: 'X', operatedOn })
    expectAppError(add('actual', null), 'VALIDATION')
    expectAppError(add('actual', '2025-12-31'), 'VALIDATION')
    expectAppError(add('estimate', D), 'VALIDATION')
    expect(add('estimate', null)()).toEqual({ id: expect.any(Number) })
    const { id } = add('actual', '2026-01-01')()
    expectAppError(
      () => service.updateEntry({ id, amount: 1, label: 'X', operatedOn: '2027-01-01' }),
      'VALIDATION'
    )
    service.updateEntry({ id, amount: 1, label: 'X', operatedOn: '2026-06-30' })
    expect(service.listEntries({ ...cell, itemId: a.id })[0]?.operatedOn).toBe('2026-06-30')
  })

  it('totalise les réalisations d’une période par date d’opération', () => {
    const { church, service } = setup()
    const { a, b, i, i1 } = church()
    const add = (itemId: number, amount: number, operatedOn: string) =>
      service.addEntry({ ...cell, itemId, amount, label: 'X', operatedOn })
    add(a.id, 100, '2026-11-23')
    add(a.id, 200, '2026-11-29')
    add(a.id, 400, '2026-11-30') // semaine suivante
    add(b.id, 50, '2026-11-25')
    const deleted = add(b.id, 1000, '2026-11-25')
    service.deleteEntry(deleted.id)
    service.addEntry({ ...cell, itemId: i1.id, amount: 7, label: 'X', operatedOn: '2026-11-24' })
    service.setTotal({ itemId: a.id, year: 2026, type: 'estimate', amount: 9999 })
    service.deleteItem(i.id) // ses réalisations ne comptent plus

    const totals = service.getPeriodTotals({
      from: '2026-11-23',
      to: '2026-11-29',
      ledger: 'expense'
    })
    expect([...totals].sort((x, y) => x.itemId - y.itemId)).toEqual([
      { itemId: a.id, total: 300, entryCount: 2 },
      { itemId: b.id, total: 50, entryCount: 1 }
    ])
  })
})
