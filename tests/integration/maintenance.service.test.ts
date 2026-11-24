import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import type { DialogAdapter } from '@main/adapters/dialog.adapter'
import { nodeFs } from '@main/adapters/fs.adapter'
import type { SystemAdapter } from '@main/adapters/system.adapter'
import { createBackupService } from '@main/backup/backup.service'
import { openDatabase } from '@main/db/client'
import { inspectDatabaseFile } from '@main/db/inspect'
import { runMigrations } from '@main/db/migrate'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createMaintenanceService } from '@main/services/maintenance.service'
import { seedSettings } from '@tests/factories/settings.seed'
import { createTempDir } from '@tests/helpers/temp-dir'
import { MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((c) => c()))

interface FakeDialog extends DialogAdapter {
  savePath: string | null
  openPath: string | null
  confirmAnswer: boolean
  confirmCalls: number
}

function setup() {
  const tmp = createTempDir()
  cleanups.push(tmp.cleanup)
  const dbPath = join(tmp.dir, 'data.db')
  const handle = openDatabase(dbPath)
  runMigrations(handle, MIGRATIONS_FOLDER)
  seedSettings(handle, { theme: 'light' })
  let closed = false
  const closeDatabase = (): void => {
    if (!closed) handle.sqlite.close()
    closed = true
  }
  cleanups.unshift(closeDatabase)

  const clock = createFixedClock(new Date(2026, 10, 24, 9, 0, 0))
  const logger = createLogger(createMemorySink())
  const backupsDir = join(tmp.dir, 'Sauvegardes')
  const backup = createBackupService({
    sqlite: handle.sqlite,
    fs: nodeFs,
    backupsDir,
    clock,
    logger
  })
  const dialog: FakeDialog = {
    savePath: null,
    openPath: null,
    confirmAnswer: true,
    confirmCalls: 0,
    chooseSavePath: async () => dialog.savePath,
    chooseOpenFile: async () => dialog.openPath,
    confirm: async () => {
      dialog.confirmCalls++
      return dialog.confirmAnswer
    }
  }
  const system = { relaunches: 0, opened: [] as string[] }
  const systemAdapter: SystemAdapter = {
    openFolder: async (p) => void system.opened.push(p),
    scheduleRelaunch: () => void system.relaunches++
  }
  const service = createMaintenanceService({
    backup,
    fs: nodeFs,
    dialog,
    system: systemAdapter,
    clock,
    logger,
    paths: { dbPath, logsDir: join(tmp.dir, 'logs'), backupsDir, documentsDir: tmp.dir },
    inspectFile: (p) => inspectDatabaseFile(p, MIGRATIONS_FOLDER),
    closeDatabase
  })
  return { tmp: tmp.dir, dbPath, handle, backup, dialog, system, service, isClosed: () => closed }
}

/** Crée une sauvegarde valide contenant theme = dark. */
function makeBackupFile(dir: string): string {
  const path = join(dir, 'source.db')
  const h = openDatabase(path)
  runMigrations(h, MIGRATIONS_FOLDER)
  seedSettings(h, { theme: 'dark' })
  h.sqlite.pragma('journal_mode = DELETE')
  h.sqlite.close()
  return path
}

function readTheme(dbPath: string): unknown {
  const db = new Database(dbPath, { readonly: true })
  try {
    return db.prepare("SELECT value FROM settings WHERE key = 'theme'").pluck().get()
  } finally {
    db.close()
  }
}

describe('MaintenanceService', () => {
  it('sauvegarde manuellement et liste les sauvegardes', async () => {
    const { service } = setup()
    const dto = await service.backupNow()
    expect(dto.fileName).toBe('sauvegarde_2026-11-24_09-00-00_manuel.db')
    expect(service.listBackups()).toEqual([dto])
  })

  it('ne refait pas de sauvegarde automatique si la dernière a moins de 24 h', async () => {
    const { service } = setup()
    expect(await service.runStartupBackup()).not.toBeNull()
    expect(await service.runStartupBackup()).toBeNull()
  })

  it('exporte une copie lisible à l’emplacement choisi', async () => {
    const { service, dialog, tmp } = setup()
    dialog.savePath = join(tmp, 'export.db')
    expect(await service.exportBackup()).toEqual({ status: 'saved', path: dialog.savePath })
    expect(readTheme(dialog.savePath)).toBe('"light"')
  })

  it('n’exporte rien si l’utilisateur annule', async () => {
    const { service } = setup()
    expect(await service.exportBackup()).toEqual({ status: 'cancelled' })
  })

  describe('restauration', () => {
    it('remplace les données, sauvegarde l’existant avant et redémarre', async () => {
      const { service, dialog, system, dbPath, tmp, backup, isClosed } = setup()
      dialog.openPath = makeBackupFile(tmp)

      expect(await service.restoreFromFile()).toEqual({ status: 'restarting' })

      expect(isClosed()).toBe(true)
      expect(readTheme(dbPath)).toBe('"dark"')
      expect(existsSync(`${dbPath}-wal`)).toBe(false)
      expect(system.relaunches).toBe(1)
      const safety = backup.list().find((b) => b.fileName.endsWith('_avant-restauration.db'))
      expect(safety && readTheme(safety.path)).toBe('"light"')
    })

    it('refuse un fichier qui n’est pas une sauvegarde, sans rien toucher', async () => {
      const { service, dialog, tmp, isClosed, system } = setup()
      const bogus = join(tmp, 'bogus.db')
      writeFileSync(bogus, 'pas une base sqlite')
      dialog.openPath = bogus

      await expect(service.restoreFromFile()).rejects.toMatchObject({ code: 'BUSINESS_RULE' })
      expect(dialog.confirmCalls).toBe(0)
      expect(isClosed()).toBe(false)
      expect(system.relaunches).toBe(0)
    })

    it('refuse une sauvegarde issue d’une version plus récente', async () => {
      const { service, dialog, tmp } = setup()
      const source = makeBackupFile(tmp)
      const db = new Database(source)
      db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(
        'future',
        Date.now() + 10 ** 10
      )
      db.close()
      dialog.openPath = source
      await expect(service.restoreFromFile()).rejects.toMatchObject({
        code: 'BUSINESS_RULE',
        message: expect.stringContaining('plus récente')
      })
    })

    it('ne fait rien si l’utilisateur refuse la confirmation', async () => {
      const { service, dialog, tmp, dbPath, isClosed } = setup()
      dialog.openPath = makeBackupFile(tmp)
      dialog.confirmAnswer = false
      expect(await service.restoreFromFile()).toEqual({ status: 'cancelled' })
      expect(isClosed()).toBe(false)
      expect(readTheme(dbPath)).toBe('"light"')
    })
  })

  it('ouvre le dossier des sauvegardes en le créant si besoin', async () => {
    const { service, system, tmp } = setup()
    await service.openBackupsFolder()
    expect(system.opened).toEqual([join(tmp, 'Sauvegardes')])
    expect(existsSync(join(tmp, 'Sauvegardes'))).toBe(true)
  })
})
