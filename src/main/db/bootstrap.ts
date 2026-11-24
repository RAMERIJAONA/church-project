import type { Logger } from '@main/logging/logger'
import type { DbHandle } from './client'
import { getPendingMigrations, hasAppliedMigrations, runMigrations } from './migrate'

export interface PrepareDatabaseOptions {
  migrationsFolder: string
  logger: Logger
  /** Sauvegarde de la base AVANT migration ; renvoie le chemin du fichier créé. */
  backupBeforeMigration: () => Promise<{ path: string }>
}

/**
 * Migre une base ouverte. Si c'est une base existante (au moins une migration déjà appliquée)
 * et qu'il y a des migrations en attente → sauvegarde d'abord (CLAUDE.md par. 7).
 */
export async function prepareDatabase(
  handle: DbHandle,
  options: PrepareDatabaseOptions
): Promise<{ applied: number; backupPath: string | null }> {
  const pending = getPendingMigrations(handle.sqlite, options.migrationsFolder)
  let backupPath: string | null = null
  if (pending.length > 0 && hasAppliedMigrations(handle.sqlite)) {
    backupPath = (await options.backupBeforeMigration()).path
    options.logger.info({ backupPath, pending: pending.length }, 'sauvegarde avant migration')
  }
  const { applied } = runMigrations(handle, options.migrationsFolder)
  options.logger.info({ applied }, 'migrations appliquées')
  return { applied, backupPath }
}
