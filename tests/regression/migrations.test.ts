/**
 * Non-régression des données (CLAUDE.md par. 9.4) : les utilisateurs migrent une base
 * EXISTANTE. Pour chaque fixture d'une version publiée : copie → migrations actuelles →
 * même nombre de lignes par table, intégrité SQLite, aucune violation de clé étrangère,
 * invariants métier.
 */
import { copyFileSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '@main/db/client'
import { getPendingMigrations, runMigrations } from '@main/db/migrate'
import { resolveSettings, type StoredSetting } from '@shared/domain/settings/settings.rules'
import { countRowsPerTable } from '@tests/helpers/db-inspect'
import { createTempDir } from '@tests/helpers/temp-dir'
import { createTestDb, MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

const FIXTURES_DIR = resolve(__dirname, '../fixtures/db')
const fixtures = readdirSync(FIXTURES_DIR)
  .filter((f) => /^v\d+\.\d+\.\d+\.db$/.test(f))
  .sort()

interface Manifest {
  version: string
  tables: Record<string, number>
}

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((c) => c()))

describe('migrations : base neuve', () => {
  it('appliquent toutes les migrations sans violation de clé étrangère', () => {
    const { sqlite } = createTestDb()
    expect(sqlite.pragma('foreign_key_check')).toEqual([])
    expect(sqlite.pragma('integrity_check', { simple: true })).toBe('ok')
  })
})

describe.each(fixtures)('migrations : fixture %s', (fixture) => {
  it('migre sans perte ni corruption', () => {
    const manifest = JSON.parse(
      readFileSync(join(FIXTURES_DIR, fixture.replace(/\.db$/, '.json')), 'utf8')
    ) as Manifest
    const tmp = createTempDir()
    cleanups.push(tmp.cleanup)
    const file = join(tmp.dir, fixture)
    copyFileSync(join(FIXTURES_DIR, fixture), file)

    const handle = openDatabase(file)
    cleanups.unshift(() => handle.sqlite.close())
    runMigrations(handle, MIGRATIONS_FOLDER)

    expect(getPendingMigrations(handle.sqlite, MIGRATIONS_FOLDER)).toHaveLength(0)
    expect(handle.sqlite.pragma('integrity_check', { simple: true })).toBe('ok')
    expect(handle.sqlite.pragma('foreign_key_check')).toEqual([])

    // Aucune table de la version d'origine ne perd ou ne gagne de lignes
    const counts = countRowsPerTable(handle.sqlite)
    for (const [table, n] of Object.entries(manifest.tables)) expect(counts[table], table).toBe(n)

    // Invariants métier : les préférences restent lisibles
    const rows = handle.sqlite.prepare('SELECT key, value FROM settings').all() as StoredSetting[]
    expect(resolveSettings(rows).invalidKeys).toEqual([])
  })
})
