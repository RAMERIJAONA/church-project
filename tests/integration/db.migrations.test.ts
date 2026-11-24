import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { prepareDatabase } from '@main/db/bootstrap'
import { openDatabase } from '@main/db/client'
import { getPendingMigrations, hasAppliedMigrations, runMigrations } from '@main/db/migrate'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createTestDb, MIGRATIONS_FOLDER } from '@tests/helpers/test-db'
import { createTempDir } from '@tests/helpers/temp-dir'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((c) => c()))

describe('migrations', () => {
  it('appliquent toutes les migrations réelles sur une base vide', () => {
    const { sqlite } = createTestDb()
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .pluck()
      .all()
    expect(tables).toContain('settings')
    expect(getPendingMigrations(sqlite, MIGRATIONS_FOLDER)).toHaveLength(0)
    expect(hasAppliedMigrations(sqlite)).toBe(true)
  })

  it('sont idempotentes : une 2e exécution n’applique rien', () => {
    const handle = createTestDb()
    expect(runMigrations(handle, MIGRATIONS_FOLDER)).toEqual({ applied: 0 })
  })

  it('activent les clés étrangères', () => {
    const { sqlite } = createTestDb()
    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
  })

  it('mettent la base fichier en WAL', () => {
    const tmp = createTempDir()
    cleanups.push(tmp.cleanup)
    const { sqlite } = openDatabase(join(tmp.dir, 'data.db'))
    cleanups.unshift(() => sqlite.close())
    expect(sqlite.pragma('journal_mode', { simple: true })).toBe('wal')
  })
})

describe('prepareDatabase', () => {
  it('ne sauvegarde pas une base neuve', async () => {
    const handle = openDatabase(':memory:')
    let backups = 0
    const res = await prepareDatabase(handle, {
      migrationsFolder: MIGRATIONS_FOLDER,
      logger: createLogger(createMemorySink()),
      backupBeforeMigration: async () => {
        backups++
        return { path: 'x' }
      }
    })
    expect(res.applied).toBeGreaterThan(0)
    expect(backups).toBe(0)
  })

  it('sauvegarde une base existante AVANT d’appliquer une migration en attente', async () => {
    const handle = createTestDb()
    // Simule une base d'une version précédente : on "oublie" la dernière migration appliquée
    handle.sqlite.exec(
      'DELETE FROM __drizzle_migrations WHERE created_at = (SELECT MAX(created_at) FROM __drizzle_migrations)'
    )
    handle.sqlite.exec("INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('old', 1)")
    handle.sqlite.exec('DROP TABLE settings')

    const order: string[] = []
    await prepareDatabase(handle, {
      migrationsFolder: MIGRATIONS_FOLDER,
      logger: createLogger(createMemorySink()),
      backupBeforeMigration: async () => {
        const hasSettings = handle.sqlite
          .prepare("SELECT 1 FROM sqlite_master WHERE name = 'settings'")
          .get()
        order.push(hasSettings ? 'backup-après' : 'backup-avant')
        return { path: 'x' }
      }
    })
    expect(order).toEqual(['backup-avant'])
    expect(getPendingMigrations(handle.sqlite, MIGRATIONS_FOLDER)).toHaveLength(0)
  })
})
