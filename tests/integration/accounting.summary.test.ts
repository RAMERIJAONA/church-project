/**
 * Synthèse prévu / réalisé (règle du porteur, 2026-11-26) : sur une période, chaque ligne est la
 * somme des valeurs saisies pendant la période (date de saisie), pour les entrées comme pour les
 * sorties. Remplace l'estimation au prorata des jours du 2026-11-25.
 */
import { describe, expect, it } from 'vitest'
import { createAccountingSummaryRepository } from '@main/repositories/accounting-summary.repository'
import { createAccountingSummaryService } from '@main/services/accounting-summary.service'
import type { EntryType } from '@shared/domain/accounting/accounting.types'
import { makeChildInput, makeRootInput } from '@tests/factories/accounting.factory'
import { setupAccounting, T9, YEAR } from '@tests/helpers/accounting-context'

/** Jour du 24/11/2026 en UTC (les bornes réelles viennent de `localInstantRange`) */
const DAY = { from: '2026-11-24T00:00:00.000Z', to: '2026-11-25T00:00:00.000Z' }

function setup() {
  const ctx = setupAccounting()
  const summary = createAccountingSummaryService({
    db: ctx.handle.db,
    summary: createAccountingSummaryRepository()
  })
  return { ...ctx, summary }
}

describe('AccountingService : synthèse par date de saisie', () => {
  it('additionne par ligne les saisies faites pendant la période', () => {
    const { church, service, clock, summary } = setup()
    const { a, b } = church()
    const add = (itemId: number, year: number, type: EntryType, amount: number) =>
      service.addEntry({ itemId, year, type, amount, label: 'X' }).id

    clock.set(new Date('2026-11-20T09:00:00.000Z')) // un autre jour
    add(a.id, YEAR, 'estimate', 1_000_000)
    const corrected = add(a.id, YEAR, 'actual', 5_000)
    clock.set(new Date(T9))
    add(a.id, YEAR, 'estimate', 100_000)
    add(b.id, YEAR, 'estimate', 20_000)
    add(a.id, YEAR, 'actual', 200_000)
    add(a.id, YEAR + 1, 'estimate', 300_000)
    add(a.id, YEAR - 1, 'actual', 7_000) // année passée : dans aucune ligne
    service.deleteEntry(add(b.id, YEAR, 'actual', 9_000))
    // Corrigée aujourd'hui, saisie le 20 : compte le 20 (date de saisie)
    service.updateEntry({ id: corrected, amount: 6_000, label: 'X' })

    expect(summary.getEnteredTotals({ ledger: 'expense', year: YEAR, ...DAY })).toEqual({
      estimate: 120_000,
      actual: 200_000,
      nextEstimate: 300_000
    })
    const week = { from: '2026-11-16T00:00:00.000Z', to: '2026-11-23T00:00:00.000Z' }
    expect(summary.getEnteredTotals({ ledger: 'expense', year: YEAR, ...week })).toEqual({
      estimate: 1_000_000,
      actual: 6_000,
      nextEstimate: null
    })
  })

  it('compte la saisie d’un total direct et exclut les rubriques supprimées', () => {
    const { church, service, summary } = setup()
    const { i, i1, a } = church()
    service.setTotal({ itemId: a.id, year: YEAR, type: 'estimate', amount: 40_000 })
    service.setTotal({ itemId: i1.id, year: YEAR, type: 'estimate', amount: 1_000 })
    service.deleteItem(i.id)
    expect(summary.getEnteredTotals({ ledger: 'expense', year: YEAR, ...DAY })).toEqual({
      estimate: 40_000,
      actual: null,
      nextEstimate: null
    })
  })

  it('sépare les entrées et les sorties', () => {
    const { service, summary } = setup()
    const income = service.createItem(makeRootInput({ ledger: 'income', description: 'rakitra' }))
    const expense = service.createItem(makeRootInput({ ledger: 'expense' }))
    const line = service.createItem(makeChildInput({ parentId: income.id }))
    service.setTotal({ itemId: line.id, year: YEAR, type: 'actual', amount: 250_000 })
    service.setTotal({ itemId: expense.id, year: YEAR, type: 'actual', amount: 80_000 })
    const actual = (ledger: 'income' | 'expense') =>
      summary.getEnteredTotals({ ledger, year: YEAR, ...DAY }).actual
    expect(actual('income')).toBe(250_000)
    expect(actual('expense')).toBe(80_000)
  })
})
