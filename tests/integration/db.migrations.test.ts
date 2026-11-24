import { cpSync, readFileSync, writeFileSync } from 'node:fs'
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

/** Copie du dossier drizzle/ sans la dernière migration = schéma de la version précédente. */
function previousVersionMigrations(): string {
  const tmp = createTempDir()
  cleanups.push(tmp.cleanup)
  cpSync(MIGRATIONS_FOLDER, tmp.dir, { recursive: true })
  const journalPath = join(tmp.dir, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: unknown[] }
  journal.entries.pop()
  writeFileSync(journalPath, JSON.stringify(journal))
  return tmp.dir
}

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
    // Base d'une version précédente : toutes les migrations sauf la dernière
    const handle = openDatabase(':memory:')
    runMigrations(handle, previousVersionMigrations())
    expect(getPendingMigrations(handle.sqlite, MIGRATIONS_FOLDER)).toHaveLength(1)

    const order: string[] = []
    await prepareDatabase(handle, {
      migrationsFolder: MIGRATIONS_FOLDER,
      logger: createLogger(createMemorySink()),
      backupBeforeMigration: async () => {
        const pending = getPendingMigrations(handle.sqlite, MIGRATIONS_FOLDER).length
        order.push(pending > 0 ? 'backup-avant' : 'backup-après')
        return { path: 'x' }
      }
    })
    expect(order).toEqual(['backup-avant'])
    expect(getPendingMigrations(handle.sqlite, MIGRATIONS_FOLDER)).toHaveLength(0)
  })
})
