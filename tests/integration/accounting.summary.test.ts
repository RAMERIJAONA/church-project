/**
 * Synthèse prévu / réalisé (règle du porteur, 2026-11-26) : sur une période, chaque ligne est la
 * somme des valeurs saisies pendant la période (date de saisie), pour les entrées comme pour les
 * sorties. Remplace l'estimation au prorata des jours du 2026-11-25.
 */
import { describe, expect, it } from 'vitest'
import type { EntryType } from '@shared/domain/accounting/accounting.types'
import { makeChildInput, makeRootInput } from '@tests/factories/accounting.factory'
import { setupAccounting as setup, T9, YEAR } from '@tests/helpers/accounting-context'

/** Jour du 24/11/2026 en UTC (les bornes réelles viennent de `localInstantRange`) */
const DAY = { from: '2026-11-24T00:00:00.000Z', to: '2026-11-25T00:00:00.000Z' }

describe('AccountingService : synthèse par date de saisie', () => {
  it('additionne par ligne les saisies faites pendant la période', () => {
    const { church, service, clock, totals } = setup()
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

    expect(totals.getEnteredTotals({ ledger: 'expense', year: YEAR, ...DAY })).toEqual({
      estimate: 120_000,
      actual: 200_000,
      nextEstimate: 300_000
    })
    const week = { from: '2026-11-16T00:00:00.000Z', to: '2026-11-23T00:00:00.000Z' }
    expect(totals.getEnteredTotals({ ledger: 'expense', year: YEAR, ...week })).toEqual({
      estimate: 1_000_000,
      actual: 6_000,
      nextEstimate: null
    })
  })

  it('compte la saisie d’un total direct et exclut les rubriques supprimées', () => {
    const { church, service, totals } = setup()
    const { i, i1, a } = church()
    service.setTotal({ itemId: a.id, year: YEAR, type: 'estimate', amount: 40_000 })
    service.setTotal({ itemId: i1.id, year: YEAR, type: 'estimate', amount: 1_000 })
    service.deleteItem(i.id)
    expect(totals.getEnteredTotals({ ledger: 'expense', year: YEAR, ...DAY })).toEqual({
      estimate: 40_000,
      actual: null,
      nextEstimate: null
    })
  })

  it('sépare les entrées et les sorties', () => {
    const { service, totals } = setup()
    const income = service.createItem(makeRootInput({ ledger: 'income', description: 'rakitra' }))
    const expense = service.createItem(makeRootInput({ ledger: 'expense' }))
    const line = service.createItem(makeChildInput({ parentId: income.id }))
    service.setTotal({ itemId: line.id, year: YEAR, type: 'actual', amount: 250_000 })
    service.setTotal({ itemId: expense.id, year: YEAR, type: 'actual', amount: 80_000 })
    const actual = (ledger: 'income' | 'expense') =>
      totals.getEnteredTotals({ ledger, year: YEAR, ...DAY }).actual
    expect(actual('income')).toBe(250_000)
    expect(actual('expense')).toBe(80_000)
  })
})

// Règle du porteur (2026-11-26) : vues Mois, Semaine, Jour, Personnalisé, entrées et sorties.
// Remplace le total des réalisations par date d'opération.
describe('AccountingSummaryService : vues par période', () => {
  it('totalise par rubrique la colonne choisie, saisies faites pendant les jours de la période', () => {
    const { church, service, clock, totals } = setup()
    const { a, b, i, i1 } = church()
    const add = (itemId: number, year: number, type: EntryType, amount: number) =>
      service.addEntry({ itemId, year, type, amount, label: 'X' }).id
    clock.set(new Date('2026-11-23T09:00:00.000Z')) // lundi
    add(a.id, YEAR, 'actual', 100)
    add(a.id, YEAR, 'estimate', 1_000)
    clock.set(new Date('2026-11-29T09:00:00.000Z')) // dimanche
    add(a.id, YEAR, 'actual', 200)
    add(b.id, YEAR + 1, 'estimate', 3_000)
    add(a.id, YEAR - 1, 'actual', 7) // réalisation 2025 saisie en retard : pas « Réalisation 2026 »
    clock.set(new Date('2026-11-30T09:00:00.000Z')) // semaine suivante
    add(a.id, YEAR, 'actual', 400)
    clock.set(new Date(T9))
    service.deleteEntry(add(b.id, YEAR, 'actual', 1_000))
    add(i1.id, YEAR, 'actual', 9)
    service.deleteItem(i.id) // ses saisies ne comptent plus

    const week = (column: 'estimate' | 'actual' | 'nextEstimate') =>
      totals.getPeriodTotals({ from: '2026-11-23', to: '2026-11-29', ledger: 'expense', column })
    expect(week('actual')).toEqual([{ itemId: a.id, total: 300, entryCount: 2 }])
    expect(week('estimate')).toEqual([{ itemId: a.id, total: 1_000, entryCount: 1 }])
    expect(week('nextEstimate')).toEqual([{ itemId: b.id, total: 3_000, entryCount: 1 }])
  })

  it('prend l’année N du premier jour de la période', () => {
    const { church, service, clock, totals } = setup()
    const { a } = church()
    clock.set(new Date('2027-01-02T09:00:00.000Z'))
    service.addEntry({ itemId: a.id, year: 2026, type: 'actual', amount: 5, label: null })
    service.addEntry({ itemId: a.id, year: 2027, type: 'actual', amount: 50, label: null })
    const actual = (from: string, to: string) =>
      totals.getPeriodTotals({ from, to, ledger: 'expense', column: 'actual' })
    expect(actual('2026-12-28', '2027-01-03')).toEqual([{ itemId: a.id, total: 5, entryCount: 1 }])
    expect(actual('2027-01-01', '2027-01-31')).toEqual([{ itemId: a.id, total: 50, entryCount: 1 }])
  })
})
