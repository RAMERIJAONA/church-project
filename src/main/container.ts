/**
 * COMPOSITION ROOT : le seul endroit où tout est instancié et câblé.
 * Aucune logique métier ici. Les chemins viennent de main/index.ts (seul à lire `app`).
 */
import { join } from 'node:path'
import { systemClock } from '@main/adapters/clock.adapter'
import { nodeFs } from '@main/adapters/fs.adapter'
import { createBackupService } from '@main/backup/backup.service'
import { prepareDatabase } from '@main/db/bootstrap'
import { openDatabase } from '@main/db/client'
import type { Logger } from '@main/logging/logger'

export interface AppPaths {
  /** %APPDATA%\Church Manager (data.db, logs) */
  userData: string
  /** Documents\Church Manager\Sauvegardes */
  backupsDir: string
  /** dossier drizzle/ (dev : racine du projet, prod : resources/drizzle) */
  migrationsFolder: string
}

export async function createContainer(paths: AppPaths, logger: Logger) {
  const dbPath = join(paths.userData, 'data.db')
  const handle = openDatabase(dbPath)
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
    handle.sqlite.close()
    throw err
  }

  return {
    handle,
    backup,
    dispose(): void {
      handle.sqlite.close()
    }
  }
}

export type Container = Awaited<ReturnType<typeof createContainer>>
