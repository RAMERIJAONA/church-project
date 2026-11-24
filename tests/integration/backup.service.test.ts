import { utimesSync } from 'node:fs'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { nodeFs } from '@main/adapters/fs.adapter'
import { backupFileName, createBackupService } from '@main/backup/backup.service'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createTestDb } from '@tests/helpers/test-db'
import { createTempDir } from '@tests/helpers/temp-dir'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((c) => c()))

function setup(keep?: number) {
  const tmp = createTempDir()
  cleanups.push(tmp.cleanup)
  const handle = createTestDb()
  const clock = createFixedClock(new Date(2026, 10, 24, 9, 0, 0))
  const service = createBackupService({
    sqlite: handle.sqlite,
    fs: nodeFs,
    backupsDir: tmp.dir,
    clock,
    logger: createLogger(createMemorySink()),
    keep
  })
  return { handle, clock, service, dir: tmp.dir }
}

describe('BackupService', () => {
  it('crée une copie lisible et identique de la base', async () => {
    const { handle, service } = setup()
    handle.sqlite
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
      .run('theme', '"dark"', '2026-11-24T09:00:00.000Z')

    const info = await service.create('manuel')

    expect(info.fileName).toBe('sauvegarde_2026-11-24_09-00-00_manuel.db')
    const copy = new Database(info.path, { readonly: true })
    cleanups.unshift(() => copy.close())
    expect(copy.prepare('SELECT value FROM settings WHERE key = ?').pluck().get('theme')).toBe(
      '"dark"'
    )
  })

  it('ne garde que les N sauvegardes les plus récentes', async () => {
    const { clock, service } = setup(3)
    for (let i = 0; i < 5; i++) {
      clock.set(new Date(2026, 10, 20 + i, 9, 0, 0))
      await service.create('auto')
    }
    expect(service.list().map((b) => b.fileName)).toEqual([
      'sauvegarde_2026-11-24_09-00-00_auto.db',
      'sauvegarde_2026-11-23_09-00-00_auto.db',
      'sauvegarde_2026-11-22_09-00-00_auto.db'
    ])
  })

  it('signale une sauvegarde auto due si la dernière a plus de 24 h', async () => {
    const { clock, service } = setup()
    expect(service.isAutoBackupDue()).toBe(true)

    const info = await service.create('auto')
    const t = new Date(2026, 10, 24, 9, 0, 0)
    utimesSync(info.path, t, t)
    clock.set(new Date(2026, 10, 25, 8, 59, 0))
    expect(service.isAutoBackupDue()).toBe(false)
    clock.set(new Date(2026, 10, 25, 9, 0, 0))
    expect(service.isAutoBackupDue()).toBe(true)
  })

  it('nomme les fichiers avec la date locale et la raison', () => {
    expect(backupFileName(new Date(2026, 0, 5, 7, 8, 9), 'avant-migration')).toBe(
      'sauvegarde_2026-01-05_07-08-09_avant-migration.db'
    )
  })
})
