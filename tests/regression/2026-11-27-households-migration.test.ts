/**
 * Migration 0009 (foyers et secteurs, porteur 2026-11-27) appliquée à une base qui a déjà des
 * fidèles (migration 0008) : les fidèles d'avant ne sont pas repris (aucune version installée
 * à l'église ne les contient, spec par. 5.4), et la migration ne doit pas échouer sur eux
 * (colonnes NOT NULL ajoutées, clés étrangères).
 */
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'
import { MIGRATIONS_FOLDER, migrationsUpTo } from '@tests/helpers/test-db'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((c) => c()))

const NOW = '2026-11-27T09:00:00.000Z'

describe('migration 0009 : foyers et secteurs', () => {
  it('migre une base qui a des fidèles sans échec ni orphelin', () => {
    const before = migrationsUpTo('0008_accounting_entries_item')
    cleanups.push(before.cleanup)
    const handle = openDatabase(':memory:')
    runMigrations(handle, before.dir)
    const insert = handle.sqlite.prepare(
      `INSERT INTO members (last_name, first_name, birth_date, address, sector, baptized,
         communicant, registration_number, created_at, updated_at)
       VALUES ('RAKOTO', ?, '1985-03-12', 'Ambatondrazaka', 'Nord', 1, 1, ?, ?, ?)`
    )
    insert.run('Tiana', 'M-1', NOW, NOW)
    insert.run('Andry', null, NOW, NOW)

    runMigrations(handle, MIGRATIONS_FOLDER)

    const { sqlite } = handle
    expect(sqlite.prepare('SELECT count(*) FROM members').pluck().get()).toBe(0)
    expect(sqlite.prepare('SELECT count(*) FROM sectors').pluck().get()).toBe(0)
    expect(sqlite.prepare('SELECT count(*) FROM households').pluck().get()).toBe(0)
    expect(sqlite.pragma('foreign_key_check')).toEqual([])
    const columns = sqlite
      .prepare('SELECT name FROM pragma_table_info(?)')
      .pluck()
      .all('members') as string[]
    expect(columns).toEqual(
      expect.arrayContaining(['household_id', 'role', 'rank', 'sex', 'deacon'])
    )
    expect(columns).not.toContain('registration_number')
    expect(columns).not.toContain('sector')
  })
})
