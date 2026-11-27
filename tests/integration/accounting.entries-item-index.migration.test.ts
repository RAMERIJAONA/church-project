/**
 * Migration 0008 (2026-11-27, optimisation) : index `accounting_entries_item_idx` sur
 * (`item_id`, `deleted_at`). Ajout d'index seul : sur une base de la version précédente, avec
 * rubriques, saisies actives et supprimées, rien n'est perdu ni modifié, les clés étrangères
 * restent valides et la liste des rubriques ayant des saisies est identique.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'
import { createAccountingRepository } from '@main/repositories/accounting.repository'
import { countRowsPerTable } from '@tests/helpers/db-inspect'
import { migrationsUpTo, MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((c) => c()))

const AT = '2026-11-20T08:00:00.000Z'

describe('migration 0008 : index des saisies par rubrique', () => {
  it('ne perd ni ne modifie aucune donnée et garde la liste des rubriques ayant des saisies', () => {
    const previous = migrationsUpTo('0007_members_unique_name')
    cleanups.push(previous.cleanup)
    const handle = openDatabase(':memory:')
    cleanups.unshift(() => handle.sqlite.close())
    runMigrations(handle, previous.dir)

    const item = handle.sqlite.prepare(
      'INSERT INTO accounting_items (id, parent_id, prefix, ledger, position, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    item.run(1, null, 'A', 'expense', 1, 'A', AT, AT, null)
    item.run(2, 1, null, 'expense', 1, 'Avec saisies', AT, AT, null)
    item.run(3, 1, null, 'expense', 2, 'Saisie supprimée seulement', AT, AT, null)
    item.run(4, null, 'A', 'income', 1, 'OFFRANDES', AT, AT, null)
    const entry = handle.sqlite.prepare(
      "INSERT INTO accounting_entries (item_id, year, type, amount, label, operated_on, created_at, updated_at, deleted_at) VALUES (?, ?, 'actual', ?, NULL, ?, ?, ?, ?)"
    )
    entry.run(2, 2025, 1000, '2025-12-31', AT, AT, null)
    entry.run(2, 2026, 2000, '2026-11-20', AT, AT, null)
    entry.run(3, 2026, 500, '2026-11-20', AT, AT, AT)
    entry.run(4, 2026, 700, '2026-11-20', AT, AT, null)

    const repo = createAccountingRepository()
    const before = {
      rows: countRowsPerTable(handle.sqlite),
      entries: handle.sqlite.prepare('SELECT * FROM accounting_entries ORDER BY id').all(),
      withEntries: [...repo.itemIdsWithEntries(handle.db)].sort()
    }

    runMigrations(handle, MIGRATIONS_FOLDER)

    expect(countRowsPerTable(handle.sqlite)).toEqual(before.rows)
    expect(handle.sqlite.prepare('SELECT * FROM accounting_entries ORDER BY id').all()).toEqual(
      before.entries
    )
    expect([...repo.itemIdsWithEntries(handle.db)].sort()).toEqual(before.withEntries)
    expect(before.withEntries).toEqual([2, 4])
    expect(handle.sqlite.pragma('foreign_key_check')).toEqual([])
    expect(
      handle.sqlite
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?")
        .get('accounting_entries_item_idx')
    ).toBeTruthy()
  })
})
