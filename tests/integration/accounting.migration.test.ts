/**
 * Migration 0002 : les rubriques / lignes / montants de la version 0001 sont repris dans
 * l'arborescence (rubrique → niveau 1, ligne → niveau 2, montant → saisie « réalisation »).
 */
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase, type DbHandle } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'
import { buildSheet, type ItemRow } from '@shared/domain/accounting/accounting.tree'
import { migrationsUpTo, MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((c) => c()))

const T0 = '2026-11-20T08:00:00.000Z'
const T1 = '2026-11-21T08:00:00.000Z'
const T2 = '2026-11-22T08:00:00.000Z'

/** Base au schéma 0001 avec des données, puis migrations actuelles. */
function migratedFrom0001(): DbHandle {
  const previous = migrationsUpTo('0001_accounting')
  cleanups.push(previous.cleanup)
  const handle = openDatabase(':memory:')
  cleanups.unshift(() => handle.sqlite.close())
  runMigrations(handle, previous.dir)

  const s = handle.sqlite
  const section = s.prepare(
    'INSERT INTO accounting_sections (id, prefix, position, description, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?)'
  )
  section.run(1, 'A', 'ASA IOMBONANA', T0, T0)
  section.run(2, 'B', 'FANAMPIANA', T0, T0)
  const line = s.prepare(
    'INSERT INTO accounting_lines (id, section_id, position, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  // Ids de lignes qui chevauchent ceux des rubriques
  line.run(1, 1, 1, 'Kitapo iombonana', T0, T0, null)
  line.run(2, 1, 2, 'Supprimée', T0, T1, T1)
  line.run(3, 1, 3, 'KTM - Adidy', T0, T0, null)
  const amount = s.prepare(
    'INSERT INTO accounting_amounts (line_id, year, amount, updated_at) VALUES (?, ?, ?, ?)'
  )
  amount.run(1, 2026, 7654321, T2)
  amount.run(2, 2025, 1000, T1)

  runMigrations(handle, MIGRATIONS_FOLDER)
  return handle
}

interface ItemDb {
  id: number
  parent_id: number | null
  prefix: string | null
  position: number
  description: string
  deleted_at: string | null
}

describe('migration 0002 : reprise des données 0001', () => {
  it('reprend rubriques, lignes et montants dans l’arborescence', () => {
    const { sqlite } = migratedFrom0001()
    const items = sqlite
      .prepare(
        'SELECT id, parent_id, prefix, position, description, deleted_at FROM accounting_items ORDER BY id'
      )
      .all() as ItemDb[]

    expect(items).toHaveLength(5)
    expect(new Set(items.map((i) => i.id)).size).toBe(5)
    const roots = items.filter((i) => i.parent_id === null)
    expect(roots.map((r) => [r.id, r.prefix, r.description])).toEqual([
      [1, 'A', 'ASA IOMBONANA'],
      [2, 'B', 'FANAMPIANA']
    ])
    const children = items.filter((i) => i.parent_id !== null)
    expect(children.map((c) => [c.parent_id, c.prefix, c.description, c.deleted_at])).toEqual([
      [1, null, 'Kitapo iombonana', null],
      [1, null, 'Supprimée', T1],
      [1, null, 'KTM - Adidy', null]
    ])

    const entries = sqlite
      .prepare(
        `SELECT i.description, e.year, e.type, e.amount, e.label, e.created_at, e.updated_at, e.deleted_at
         FROM accounting_entries e JOIN accounting_items i ON i.id = e.item_id ORDER BY e.year DESC`
      )
      .all()
    expect(entries).toEqual([
      {
        description: 'Kitapo iombonana',
        year: 2026,
        type: 'actual',
        amount: 7654321,
        label: null,
        created_at: T2,
        updated_at: T2,
        deleted_at: null
      },
      {
        description: 'Supprimée',
        year: 2025,
        type: 'actual',
        amount: 1000,
        label: null,
        created_at: T1,
        updated_at: T1,
        deleted_at: null
      }
    ])
  })

  it('supprime les anciennes tables sans orphelin', () => {
    const { sqlite } = migratedFrom0001()
    const old = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('accounting_sections', 'accounting_lines', 'accounting_amounts')"
      )
      .all()
    expect(old).toEqual([])
    expect(sqlite.pragma('foreign_key_check')).toEqual([])
    expect(sqlite.pragma('integrity_check', { simple: true })).toBe('ok')
  })

  it('donne les numéros A1-1, A1-2 après migration', () => {
    const { sqlite } = migratedFrom0001()
    const rows = sqlite
      .prepare(
        'SELECT id, parent_id AS parentId, prefix, position, description FROM accounting_items WHERE deleted_at IS NULL'
      )
      .all() as ItemRow[]
    const sheet = buildSheet(2026, rows, [], new Set())
    expect(
      sheet.items.map((i) => [i.code, i.children.map((c) => [c.code, c.description])])
    ).toEqual([
      [
        'A1',
        [
          ['A1-1', 'Kitapo iombonana'],
          ['A1-2', 'KTM - Adidy']
        ]
      ],
      ['B1', []]
    ])
  })

  it('un nouvel élément ne réutilise pas un id repris', () => {
    const { sqlite } = migratedFrom0001()
    const max = sqlite.prepare('SELECT MAX(id) FROM accounting_items').pluck().get() as number
    const id = sqlite
      .prepare(
        "INSERT INTO accounting_items (parent_id, prefix, position, description, created_at, updated_at) VALUES (NULL, 'D', 1, 'X', ?, ?) RETURNING id"
      )
      .pluck()
      .get(T2, T2) as number
    expect(id).toBeGreaterThan(max)
  })
})
