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
import { createFixedClock } from '@main/adapters/clock.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createMembersRepository } from '@main/repositories/members.repository'
import { createMembersService } from '@main/services/members.service'
import {
  createMemberInputSchema,
  listMembersInputSchema,
  updateMemberInputSchema
} from '@shared/domain/members/members.types'
import { makeMemberInput } from '@tests/factories/members.factory'
import { cell, setupAccounting, YEAR } from '@tests/helpers/accounting-context'
import { createTestDb } from '@tests/helpers/test-db'

const TABLES = 'accounting_entries|accounting_items|members'

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

  it('fidèles : ajout, liste, recherche, modification, suppression', () => {
    const handle = createTestDb()
    const members = createMembersService({
      db: handle.db,
      members: createMembersRepository(),
      clock: createFixedClock(new Date('2026-11-27T09:00:00.000Z')),
      logger: createLogger(createMemorySink())
    })
    const plans = plansOf(handle.sqlite, () => {
      const m = members.create(
        createMemberInputSchema.parse(makeMemberInput({ registrationNumber: 'M-1' }))
      )
      members.list(listMembersInputSchema.parse({}))
      members.list(listMembersInputSchema.parse({ search: 'rakto' }))
      members.update(
        updateMemberInputSchema.parse({ ...makeMemberInput({ sector: 'Nord' }), id: m.id })
      )
      members.delete(m.id)
    })
    expect(plans.length).toBeGreaterThan(5)
    expect(costlySteps(plans)).toEqual([])
  })
})
