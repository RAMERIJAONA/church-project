/**
 * COMPOSITION ROOT : le seul endroit où tout est instancié et câblé.
 * Aucune logique métier ici. Chemins et adapters Electron viennent de main/index.ts.
 */
import { join } from 'node:path'
import { systemClock } from '@main/adapters/clock.adapter'
import type { DialogAdapter } from '@main/adapters/dialog.adapter'
import type { PrintAdapter } from '@main/adapters/print.adapter'
import { nodeFs } from '@main/adapters/fs.adapter'
import type { SystemAdapter } from '@main/adapters/system.adapter'
import { createBackupService } from '@main/backup/backup.service'
import { prepareDatabase } from '@main/db/bootstrap'
import { openDatabase } from '@main/db/client'
import { inspectDatabaseFile } from '@main/db/inspect'
import type { Logger } from '@main/logging/logger'
import { createAccountingSummaryRepository } from '@main/repositories/accounting-summary.repository'
import { createAccountingRepository } from '@main/repositories/accounting.repository'
import { createSettingsRepository } from '@main/repositories/settings.repository'
import { createAccountingExportService } from '@main/services/accounting-export.service'
import { createAccountingSummaryService } from '@main/services/accounting-summary.service'
import { createAccountingService } from '@main/services/accounting.service'
import { createMaintenanceService } from '@main/services/maintenance.service'
import { createPrintService } from '@main/services/print.service'
import { createSettingsService } from '@main/services/settings.service'

export interface AppPaths {
  /** %APPDATA%\<productName> (data.db, logs) */
  userData: string
  logsDir: string
  /** Documents\<productName>\Sauvegardes */
  backupsDir: string
  documentsDir: string
  /** dossier drizzle/ (dev : racine du projet, prod : resources/drizzle) */
  migrationsFolder: string
}

export interface PlatformAdapters {
  dialog: DialogAdapter
  system: SystemAdapter
  print: PrintAdapter
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

  const accounting = createAccountingService({
    db: handle.db,
    accounting: createAccountingRepository(),
    clock: systemClock,
    logger: logger.child({ module: 'accounting' })
  })

  const accountingExport = createAccountingExportService({
    accounting,
    dialog: platform.dialog,
    fs: nodeFs,
    documentsDir: paths.documentsDir,
    clock: systemClock,
    logger: logger.child({ module: 'export' })
  })

  const accountingSummary = createAccountingSummaryService({
    db: handle.db,
    summary: createAccountingSummaryRepository()
  })

  const print = createPrintService({
    printer: platform.print,
    dialog: platform.dialog,
    documentsDir: paths.documentsDir,
    clock: systemClock,
    logger: logger.child({ module: 'print' })
  })

  return {
    handle,
    backup,
    settings,
    maintenance,
    accounting,
    accountingExport,
    accountingSummary,
    print,
    dispose: closeDatabase
  }
}

export type Container = Awaited<ReturnType<typeof createContainer>>
