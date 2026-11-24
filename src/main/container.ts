/**
 * COMPOSITION ROOT : le seul endroit où tout est instancié et câblé.
 * Aucune logique métier ici. Chemins et adapters Electron viennent de main/index.ts.
 */
import { join } from 'node:path'
import { systemClock } from '@main/adapters/clock.adapter'
import type { DialogAdapter } from '@main/adapters/dialog.adapter'
import { nodeFs } from '@main/adapters/fs.adapter'
import type { SystemAdapter } from '@main/adapters/system.adapter'
import { createBackupService } from '@main/backup/backup.service'
import { prepareDatabase } from '@main/db/bootstrap'
import { openDatabase } from '@main/db/client'
import { inspectDatabaseFile } from '@main/db/inspect'
import type { Logger } from '@main/logging/logger'
import { createSettingsRepository } from '@main/repositories/settings.repository'
import { createMaintenanceService } from '@main/services/maintenance.service'
import { createSettingsService } from '@main/services/settings.service'

export interface AppPaths {
  /** %APPDATA%\Church Manager (data.db, logs) */
  userData: string
  logsDir: string
  /** Documents\Church Manager\Sauvegardes */
  backupsDir: string
  documentsDir: string
  /** dossier drizzle/ (dev : racine du projet, prod : resources/drizzle) */
  migrationsFolder: string
}

export interface PlatformAdapters {
  dialog: DialogAdapter
  system: SystemAdapter
}

export async function createContainer(paths: AppPaths, logger: Logger, platform: PlatformAdapters) {
  const dbPath = join(paths.userData, 'data.db')
  const handle = openDatabase(dbPath)
  let closed = false
  const closeDatabase = (): void => {
    if (closed) return
    closed = true
    handle.sqlite.close()
    logger.info({ dbPath }, 'base fermée')
  }
  logger.info({ dbPath }, 'base ouverte')

  const backup = createBackupService({
    sqlite: handle.sqlite,
    fs: nodeFs,
    backupsDir: paths.backupsDir,
    clock: systemClock,
    logger: logger.child({ module: 'backup' })
  })

  try {
    await prepareDatabase(handle, {
      migrationsFolder: paths.migrationsFolder,
      logger: logger.child({ module: 'db' }),
      backupBeforeMigration: () => backup.create('avant-migration')
    })
  } catch (err) {
    logger.error({ err, dbPath }, 'échec de préparation de la base')
    closeDatabase()
    throw err
  }

  const settings = createSettingsService({
    db: handle.db,
    settings: createSettingsRepository(),
    clock: systemClock,
    logger: logger.child({ module: 'settings' })
  })

  const maintenance = createMaintenanceService({
    backup,
    fs: nodeFs,
    dialog: platform.dialog,
    system: platform.system,
    clock: systemClock,
    logger: logger.child({ module: 'maintenance' }),
    paths: {
      dbPath,
      logsDir: paths.logsDir,
      backupsDir: paths.backupsDir,
      documentsDir: paths.documentsDir
    },
    inspectFile: (path) => inspectDatabaseFile(path, paths.migrationsFolder),
    closeDatabase
  })

  return { handle, backup, settings, maintenance, dispose: closeDatabase }
}

export type Container = Awaited<ReturnType<typeof createContainer>>
