/**
 * Migration 0003 : chaque réalisation reçoit une date d'opération. Reprise : la date de saisie
 * si elle tombe dans l'année de la case, sinon le 31 décembre de cette année. Les estimations
 * restent sans date.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase, type DbHandle } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'
import { migrationsUpTo, MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((c) => c()))

const AT = '2026-11-20T08:00:00.000Z'

function migratedFrom0002(): DbHandle {
  const previous = migrationsUpTo('0002_accounting_tree')
  cleanups.push(previous.cleanup)
  const handle = openDatabase(':memory:')
  cleanups.unshift(() => handle.sqlite.close())
  runMigrations(handle, previous.dir)

  const s = handle.sqlite
  s.prepare(
    "INSERT INTO accounting_items (id, parent_id, prefix, position, description, created_at, updated_at) VALUES (1, NULL, 'A', 1, 'ASA', ?, ?)"
  ).run(AT, AT)
  const entry = s.prepare(
    'INSERT INTO accounting_entries (id, item_id, year, type, amount, label, created_at, updated_at, deleted_at) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)'
  )
  entry.run(1, 2026, 'actual', 1000, null, AT, AT, null) // saisie dans l'année
  entry.run(2, 2025, 'actual', 2000, 'Ancien', AT, AT, null) // saisie en 2026 pour 2025
  entry.run(3, 2026, 'estimate', 3000, null, AT, AT, null)
  entry.run(4, 2026, 'actual', 4000, null, AT, AT, AT) // supprimée : reprise quand même

  runMigrations(handle, MIGRATIONS_FOLDER)
  return handle
}

describe('migration 0003 : date d’opération des réalisations', () => {
  it('date les réalisations existantes et laisse les estimations sans date', () => {
    const { sqlite } = migratedFrom0002()
    const rows = sqlite
      .prepare(
        'SELECT id, year, type, amount, label, operated_on, deleted_at FROM accounting_entries ORDER BY id'
      )
      .all()
    expect(rows).toEqual([
      {
        id: 1,
        year: 2026,
        type: 'actual',
        amount: 1000,
        label: null,
        operated_on: '2026-11-20',
        deleted_at: null
      },
      {
        id: 2,
        year: 2025,
        type: 'actual',
        amount: 2000,
        label: 'Ancien',
        operated_on: '2025-12-31',
        deleted_at: null
      },
      {
        id: 3,
        year: 2026,
        type: 'estimate',
        amount: 3000,
        label: null,
        operated_on: null,
        deleted_at: null
      },
      {
        id: 4,
        year: 2026,
        type: 'actual',
        amount: 4000,
        label: null,
        operated_on: '2026-11-20',
        deleted_at: AT
      }
    ])
    expect(sqlite.pragma('foreign_key_check')).toEqual([])
    expect(sqlite.pragma('integrity_check', { simple: true })).toBe('ok')
  })

  it('refuse en base une réalisation sans date ou datée d’une autre année', () => {
    const { sqlite } = migratedFrom0002()
    const insert = sqlite.prepare(
      'INSERT INTO accounting_entries (item_id, year, type, amount, operated_on, created_at, updated_at) VALUES (1, 2026, ?, 1, ?, ?, ?)'
    )
    expect(() => insert.run('actual', null, AT, AT)).toThrow(/CHECK/)
    expect(() => insert.run('actual', '2025-06-01', AT, AT)).toThrow(/CHECK/)
    expect(() => insert.run('estimate', '2026-06-01', AT, AT)).toThrow(/CHECK/)
    expect(() => insert.run('actual', '2026-06-01', AT, AT)).not.toThrow()
  })
})
