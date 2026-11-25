/**
 * Migration 0005 : une lettre par rubrique principale (règle du porteur, 2026-11-25).
 * Avant, une lettre pouvait servir plusieurs fois (sorties D1, D2 ; entrées A2, A3). Les
 * rubriques actives reçoivent A, B, D… sans doublon ni trou, par comptabilité ; les
 * sous-rubriques et les saisies ne bougent pas ; la base refuse ensuite une lettre en double.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'
import { createAccountingRepository } from '@main/repositories/accounting.repository'
import { buildSheet } from '@shared/domain/accounting/accounting.tree'
import { migrationsUpTo, MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((c) => c()))

const AT = '2026-11-20T08:00:00.000Z'

function previousDb() {
  const previous = migrationsUpTo('0004_accounting_ledger')
  cleanups.push(previous.cleanup)
  const handle = openDatabase(':memory:')
  cleanups.unshift(() => handle.sqlite.close())
  runMigrations(handle, previous.dir)
  const insert = handle.sqlite.prepare(
    'INSERT INTO accounting_items (id, parent_id, prefix, ledger, position, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  return { handle, insert }
}

describe('migration 0005 : une lettre par rubrique principale', () => {
  it('sépare les lettres en double et comble les trous, par comptabilité', () => {
    const { handle, insert } = previousDb()
    // Sorties : A1, D1, D2 (+ une D supprimée), F1, AA1 → A1, B1, D1, E1, F1
    insert.run(1, null, 'A', 'expense', 1, 'A', AT, AT, null)
    insert.run(2, null, 'D', 'expense', 2, 'JEUNESSE', AT, AT, null)
    insert.run(3, null, 'D', 'expense', 1, 'ÉCOLE', AT, AT, null)
    insert.run(4, null, 'D', 'expense', 3, 'SUPPRIMÉE', AT, AT, AT)
    insert.run(5, null, 'F', 'expense', 1, 'F', AT, AT, null)
    insert.run(6, null, 'AA', 'expense', 1, 'AA', AT, AT, null)
    insert.run(7, 2, null, 'expense', 1, 'Sous-rubrique de D2', AT, AT, null)
    // Entrées : A2, A3, B2 → A2, B2, D2
    insert.run(10, null, 'A', 'income', 1, 'OFFRANDES', AT, AT, null)
    insert.run(11, null, 'A', 'income', 2, 'DIVERSES', AT, AT, null)
    insert.run(12, null, 'B', 'income', 1, 'SUBVENTIONS', AT, AT, null)
    handle.sqlite
      .prepare(
        "INSERT INTO accounting_entries (item_id, year, type, amount, created_at, updated_at) VALUES (7, 2026, 'estimate', 1000, ?, ?)"
      )
      .run(AT, AT)

    runMigrations(handle, MIGRATIONS_FOLDER)

    const s = handle.sqlite
    const rows = s
      .prepare('SELECT id, prefix FROM accounting_items WHERE parent_id IS NULL ORDER BY id')
      .all()
    expect(rows).toEqual([
      { id: 1, prefix: 'A' },
      { id: 2, prefix: 'D' }, // ancien D2 (après D1 en position)
      { id: 3, prefix: 'B' }, // ancien D1
      { id: 4, prefix: 'D' }, // supprimée : inchangée, hors index
      { id: 5, prefix: 'E' },
      { id: 6, prefix: 'F' },
      { id: 10, prefix: 'A' },
      { id: 11, prefix: 'B' },
      { id: 12, prefix: 'D' }
    ])
    const repo = createAccountingRepository()
    const codes = (ledger: 'expense' | 'income'): string[] =>
      buildSheet(2026, repo.listItems(handle.db, ledger), [], new Set(), ledger).items.map(
        (i) => i.code
      )
    expect(codes('expense')).toEqual(['A1', 'B1', 'D1', 'E1', 'F1'])
    expect(codes('income')).toEqual(['A2', 'B2', 'D2'])
    // Sous-rubrique et saisie suivent leur rubrique (liées à l'id)
    expect(s.prepare('SELECT parent_id FROM accounting_items WHERE id = 7').get()).toEqual({
      parent_id: 2
    })
    expect(s.prepare('SELECT count(*) AS n FROM accounting_entries').get()).toEqual({ n: 1 })
    // Seules les rubriques renommées changent de date de modification
    expect(s.prepare('SELECT updated_at FROM accounting_items WHERE id = 1').get()).toEqual({
      updated_at: AT
    })
  })

  it('refuse ensuite deux rubriques actives de même lettre dans une comptabilité', () => {
    const { handle, insert } = previousDb()
    insert.run(1, null, 'A', 'expense', 1, 'A', AT, AT, null)
    runMigrations(handle, MIGRATIONS_FOLDER)
    // Même lettre dans l'autre comptabilité, ou supprimée : accepté
    insert.run(2, null, 'A', 'income', 1, 'A', AT, AT, null)
    insert.run(3, null, 'A', 'expense', 2, 'A', AT, AT, AT)
    expect(() => insert.run(4, null, 'A', 'expense', 3, 'A', AT, AT, null)).toThrow(
      /UNIQUE constraint failed/
    )
  })
})
