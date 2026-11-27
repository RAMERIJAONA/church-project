/**
 * Non-régression des performances SQL (demande du porteur, 2026-11-27 : « optimise tout »).
 * Rejoue les parcours réels des services et demande à SQLite le plan de chaque requête
 * exécutée : aucune ne doit parcourir une table métier sans index, ni trier pour dédoublonner ;
 * aucune écriture ne doit parcourir les saisies (clé étrangère `item_id` indexée).
 * Exceptions voulues : lectures complètes PAR UN INDEX (comptage des fidèles, index de
 * recherche en mémoire, rubriques ayant des saisies) et la table `settings` (quelques lignes).
 */
import { describe, expect, it } from 'vitest'
import type { Sqlite } from '@main/db/client'
import { swapChildRankInputSchema } from '@shared/domain/members/members.types'
import { renameSectorInputSchema } from '@shared/domain/members/sectors.types'
import { cell, setupAccounting, YEAR } from '@tests/helpers/accounting-context'
import { setupMembers } from '@tests/helpers/members-context'

const TABLES = 'accounting_entries|accounting_items|members|households|sectors'

/** Requêtes préparées pendant `run`, avec leur plan d'exécution. */
function plansOf(sqlite: Sqlite, run: () => void): Array<{ sql: string; plan: string[] }> {
  const seen = new Set<string>()
  const original = sqlite.prepare.bind(sqlite)
  const spy = ((sql: string) => {
    seen.add(sql)
    return original(sql)
  }) as Sqlite['prepare']
  sqlite.prepare = spy
  try {
    run()
  } finally {
    sqlite.prepare = original
  }
  return [...seen]
    .filter((sql) => !/^\s*(pragma|savepoint|release|begin|commit|rollback)/i.test(sql))
    .map((sql) => ({
      sql,
      // Paramètres remplacés par une valeur : le plan ne dépend pas de la valeur liée
      plan: sqlite
        .prepare(`EXPLAIN QUERY PLAN ${sql.replace(/\?/g, '1')}`)
        .all()
        .map((r) => (r as { detail: string }).detail)
    }))
}

/** Étapes coûteuses d'un plan, avec la requête en cause. */
function costlySteps(plans: ReturnType<typeof plansOf>): string[] {
  const bareScan = new RegExp(`^SCAN (${TABLES})$`)
  return plans.flatMap(({ sql, plan }) => {
    const isWrite = /^\s*(insert|update|delete|with)/i.test(sql)
    return plan
      .filter(
        (step) =>
          bareScan.test(step.trim()) ||
          /TEMP B-TREE FOR DISTINCT/.test(step) ||
          (isWrite && /^SCAN accounting_entries/.test(step.trim()))
      )
      .map((step) => `${step}  ←  ${sql.replace(/\s+/g, ' ').slice(0, 120)}`)
  })
}

describe('plans des requêtes SQL', () => {
  it('comptabilité : affichage, rubriques, saisies, synthèse, suppression', () => {
    const { handle, service, totals, church, child } = setupAccounting()
    const { f1, a, b } = church()
    const entry = service.addEntry({ itemId: a.id, ...cell, amount: 1000, label: 'X' })

    const plans = plansOf(handle.sqlite, () => {
      service.getSheet(YEAR)
      service.getSheet(YEAR, 'income')
      child(f1.id, 'Nouvelle')
      service.addEntry({ itemId: b.id, ...cell, amount: 500, label: null })
      service.listEntries({ itemId: a.id, ...cell })
      service.updateEntry({ id: entry.id, amount: 1200, label: 'Y' })
      totals.getEnteredTotals({
        ledger: 'expense',
        year: YEAR,
        from: '2026-11-24T00:00:00.000Z',
        to: '2026-11-25T00:00:00.000Z'
      })
      totals.getPeriodTotals({
        ledger: 'expense',
        column: 'actual',
        from: '2026-11-01',
        to: '2026-11-30'
      })
      service.deleteEntry(entry.id)
      service.deleteItem(b.id)
    })
    expect(plans.length).toBeGreaterThan(5)
    expect(costlySteps(plans)).toEqual([])
  })

  it('fidèles : ajout, liste, recherche, modification, échange, suppression', () => {
    const { handle, household, member, update, list, membersService } = setupMembers()
    const one = household()
    const plans = plansOf(handle.sqlite, () => {
      const jean = member(one.id, { role: 'father', firstName: 'Jean', deacon: true })
      const andry = member(one.id, { firstName: 'Andry' })
      const nirina = member(one.id, { firstName: 'Nirina' })
      list()
      list({ search: 'rakto' })
      membersService.get(andry.id)
      membersService.sponsoredHouseholds(jean.id)
      membersService.swapChildRank(
        swapChildRankInputSchema.parse({ id: nirina.id, direction: 'up' })
      )
      update(jean, { deacon: false })
      membersService.delete(nirina.id)
    })
    expect(plans.length).toBeGreaterThan(5)
    expect(costlySteps(plans)).toEqual([])
  })

  it('foyers et secteurs : création, liste, filtres, ouverture, parrains, liste globale', () => {
    const ctx = setupMembers()
    const { handle, sector, household, member, updateHousehold, listHouseholds, list } = ctx
    const plans = plansOf(handle.sqlite, () => {
      const one = sector('Ambodimanga')
      const two = sector('Antanety')
      ctx.sectorsService.rename(
        renameSectorInputSchema.parse({ id: two.id, name: 'Antanety Atsimo' })
      )
      ctx.sectorsService.list()
      const h = household({ sectorId: one.id })
      const rabe = member(h.id, {
        role: 'father',
        lastName: 'RABE',
        firstName: 'Jean',
        deacon: true
      })
      const other = household({ sectorId: two.id, sponsorId: rabe.id })
      member(other.id, { firstName: 'Andry' })
      updateHousehold({ id: other.id, sectorId: one.id, sponsorId: rabe.id })
      ctx.householdsService.get(other.id)
      listHouseholds()
      listHouseholds({ sectorId: one.id, sponsorMissing: true })
      listHouseholds({ search: '2' })
      listHouseholds({ search: 'rabe' })
      ctx.householdsService.sponsorCandidates('')
      ctx.householdsService.sponsorCandidates('rabe')
      list({ sectorId: one.id, deacon: true, sort: 'matricule' })
      ctx.householdsService.delete(household().id)
    })
    expect(plans.length).toBeGreaterThan(5)
    expect(costlySteps(plans)).toEqual([])
  })
})
