/**
 * Migration 0004 : comptabilité des entrées. Les rubriques existantes deviennent des sorties
 * (`expense`), leurs numéros ne changent pas ; la base refuse une comptabilité inconnue.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'
import { migrationsUpTo, MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((c) => c()))

const AT = '2026-11-20T08:00:00.000Z'

describe('migration 0004 : comptabilité des entrées', () => {
  it('classe les rubriques existantes dans les sorties et refuse une valeur inconnue', () => {
    const previous = migrationsUpTo('0003_accounting_operated_on')
    cleanups.push(previous.cleanup)
    const handle = openDatabase(':memory:')
    cleanups.unshift(() => handle.sqlite.close())
    runMigrations(handle, previous.dir)
    const s = handle.sqlite
    const insert = s.prepare(
      'INSERT INTO accounting_items (id, parent_id, prefix, position, description, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)'
    )
    insert.run(1, null, 'A', 'ASA', AT, AT)
    insert.run(2, 1, null, 'Mpitandrina', AT, AT)

    runMigrations(handle, MIGRATIONS_FOLDER)

    expect(s.prepare('SELECT id, ledger FROM accounting_items ORDER BY id').all()).toEqual([
      { id: 1, ledger: 'expense' },
      { id: 2, ledger: 'expense' }
    ])
    expect(() =>
      s
        .prepare(
          "INSERT INTO accounting_items (parent_id, prefix, position, description, created_at, updated_at, ledger) VALUES (NULL, 'B', 1, 'X', ?, ?, 'autre')"
        )
        .run(AT, AT)
    ).toThrow(/CHECK constraint failed/)
  })
})
