/**
 * Grand jeu de démonstration (`npm run seed:accounting`) : passe par le service, couvre ce qu'on
 * veut tester à la main, et reste cohérent (aucune réalisation dans le futur, années couvertes).
 */
import { describe, expect, it } from 'vitest'
import { periodRange } from '@shared/domain/accounting/accounting.periods'
import { rollUp } from '@shared/domain/accounting/accounting.totals'
import type { AccountingItemDTO } from '@shared/domain/accounting/accounting.types'
import { MAX_AMOUNT } from '@shared/utils/money'
import { seedDemo } from '@tests/factories/accounting.demo-seed'
import { setupAccounting } from '@tests/helpers/accounting-context'

const TODAY = '2026-11-25'

function seeded() {
  const ctx = setupAccounting()
  const summary = seedDemo(ctx.service, ctx.clock, TODAY)
  return { ...ctx, summary }
}

const flat = (items: AccountingItemDTO[]): AccountingItemDTO[] =>
  items.flatMap((i) => [i, ...flat(i.children)])

describe('seed de démonstration', () => {
  // Une seule génération pour tout le fichier (quelques milliers de saisies)
  const { service, summary } = seeded()
  const sheet = (year: number) => flat(service.getSheet(year).items)
  const total = (year: number, col: 'estimate' | 'actual' | 'nextEstimate') =>
    rollUp(service.getSheet(year).items, (i) => i.amounts?.[col].total ?? null).grand

  it('crée un grand plan sur 4 niveaux, sous 200 rangées (tableau non virtualisé)', () => {
    const items = sheet(2026)
    expect(items.length).toBe(summary.items)
    expect(items.length).toBeGreaterThan(150)
    expect(items.length).toBeLessThan(200)
    expect(new Set(items.map((i) => i.level))).toEqual(new Set([1, 2, 3, 4]))
    expect(summary.entries).toBeGreaterThan(2000)
  })

  it('renumérote après la section supprimée et garde une rubrique principale à montants', () => {
    const roots = service.getSheet(2026).items
    expect(roots.filter((r) => r.prefix === 'A').map((r) => [r.code, r.description])).toEqual([
      ['A1', 'OFFRANDES ET DONS'],
      ['A2', 'RECETTES DIVERSES']
    ])
    expect(roots.find((r) => r.code === 'K1')?.amounts).not.toBeNull()
  })

  it('couvre 6 années : estimations partout, réalisations jusqu’à cette année', () => {
    expect(summary.years).toEqual([2022, 2027])
    for (let year = 2022; year <= 2027; year++) {
      expect(total(year, 'estimate'), String(year)).toBeGreaterThan(0)
      if (year <= 2026) expect(total(year, 'actual'), String(year)).toBeGreaterThan(0)
    }
    expect(total(2027, 'actual')).toBeNull()
  })

  it('n’a aucune réalisation dans le futur, et en a aujourd’hui et cette semaine', () => {
    expect(service.getPeriodTotals({ from: '2026-11-26', to: '2027-12-31' })).toEqual([])
    expect(service.getPeriodTotals({ from: TODAY, to: TODAY }).length).toBeGreaterThan(0)
    expect(service.getPeriodTotals(periodRange('week', TODAY)).length).toBeGreaterThan(1)
  })

  it('mélange cases vides, simples, détaillées, modifiées, supprimées et tardives', () => {
    const cells = sheet(2025).flatMap((i) => (i.amounts ? [i.amounts.actual] : []))
    expect(cells.some((c) => c.total === null)).toBe(true)
    expect(cells.some((c) => c.total !== null && !c.detailed)).toBe(true)
    expect(cells.some((c) => c.detailed && c.entryCount >= 3)).toBe(true)
    expect(summary.detailedCells).toBeGreaterThan(100)
    expect(summary.modifiedEntries).toBeGreaterThan(10)
    expect(summary.deletedEntries).toBeGreaterThan(5)
    expect(summary.lateEntries).toBeGreaterThan(5)
    // Saisie tardive : faite en 2026 pour une case de 2025
    const late = sheet(2025)
      .filter((i) => i.amounts?.actual.detailed)
      .flatMap((i) => service.listEntries({ itemId: i.id, year: 2025, type: 'actual' }))
      .find((e) => e.label === 'Régularisation')
    expect(late?.createdAt.startsWith('2026-')).toBe(true)
    expect(late?.operatedOn).toBe('2025-12-31')
  })

  it('a de très grands montants (11 à 12 chiffres) sans dépasser le plafond', () => {
    const big = sheet(2026).find((i) => i.code === 'L1')?.amounts?.estimate.total ?? 0
    expect(String(big).length).toBeGreaterThanOrEqual(11)
    for (const col of ['estimate', 'actual', 'nextEstimate'] as const) {
      expect(total(2026, col) ?? 0).toBeLessThanOrEqual(MAX_AMOUNT)
    }
  })
})
