import { join } from 'node:path'
import type { Clock } from '@main/adapters/clock.adapter'
import type { DialogAdapter } from '@main/adapters/dialog.adapter'
import type { FsAdapter } from '@main/adapters/fs.adapter'
import type { SystemAdapter } from '@main/adapters/system.adapter'
import type { BackupInfo, BackupService } from '@main/backup/backup.service'
import type { DatabaseFileReport } from '@main/db/inspect'
import type { Logger } from '@main/logging/logger'
import { AppError } from '@shared/domain/errors'
import type { BackupDTO, ExportResultDTO, RestoreResultDTO } from '@shared/ipc/contract'
import { formatDateTime } from '@shared/utils/dates'

const pad = (n: number): string => String(n).padStart(2, '0')

export function toBackupDTO(b: BackupInfo): BackupDTO {
  return { fileName: b.fileName, size: b.size, createdAt: b.createdAt.toISOString() }
}

/** Sauvegardes manuelles, export, restauration, dossiers : tout ce que propose Paramètres. */
export function createMaintenanceService(deps: {
  backup: BackupService
  fs: FsAdapter
  dialog: DialogAdapter
  system: SystemAdapter
  clock: Clock
  logger: Logger
  paths: { dbPath: string; logsDir: string; backupsDir: string; documentsDir: string }
  inspectFile: (path: string) => DatabaseFileReport
  closeDatabase: () => void
}) {
  const { logger } = deps

  return {
    listBackups(): BackupDTO[] {
      return deps.backup.list().map(toBackupDTO)
    },

    async backupNow(): Promise<BackupDTO> {
      return toBackupDTO(await deps.backup.create('manuel'))
    },

    /** Sauvegarde automatique au démarrage si la dernière a plus de 24 h. */
    async runStartupBackup(): Promise<BackupDTO | null> {
      if (!deps.backup.isAutoBackupDue()) return null
      return toBackupDTO(await deps.backup.create('auto'))
    },

    async exportBackup(): Promise<ExportResultDTO> {
      const d = deps.clock()
      const name = `church-manager_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.db`
      const target = await deps.dialog.chooseSavePath({
        title: 'Exporter une sauvegarde',
        defaultPath: join(deps.paths.documentsDir, name)
      })
      if (!target) return { status: 'cancelled' }
      if (target === deps.paths.dbPath) {
        throw new AppError('BUSINESS_RULE', 'Choisissez un autre emplacement que la base en cours.')
      }
      await deps.backup.backupTo(target)
      logger.info({ target }, 'sauvegarde exportée')
      return { status: 'saved', path: target }
    },

    /**
     * Restauration : contrôle du fichier → confirmation → sauvegarde des données actuelles →
     * fermeture → remplacement (copie temporaire + renommage) → redémarrage.
     * Au redémarrage, les migrations s'appliquent si la sauvegarde vient d'une version antérieure.
     */
    async restoreFromFile(): Promise<RestoreResultDTO> {
      const source = await deps.dialog.chooseOpenFile({
        title: 'Restaurer une sauvegarde',
        defaultPath: deps.paths.backupsDir
      })
      if (!source) return { status: 'cancelled' }

      const report = deps.inspectFile(source)
      if (!report.readable || !report.isAppDatabase) {
        logger.warn({ source, report }, 'restauration refusée : fichier invalide')
        throw new AppError(
          'BUSINESS_RULE',
          'Ce fichier n’est pas une sauvegarde Church Manager valide (ou il est endommagé).',
          { source }
        )
      }
      if (
        report.lastMigrationMillis !== null &&
        report.latestKnownMigrationMillis !== null &&
        report.lastMigrationMillis > report.latestKnownMigrationMillis
      ) {
        throw new AppError(
          'BUSINESS_RULE',
          'Cette sauvegarde provient d’une version plus récente de Church Manager. Mettez d’abord le logiciel à jour.',
          { source }
        )
      }

      const confirmed = await deps.dialog.confirm({
        title: 'Restaurer une sauvegarde',
        message: 'Remplacer les données actuelles par cette sauvegarde ?',
        detail: `${source}\n\nUne copie des données actuelles est faite avant (${formatDateTime(deps.clock())}). L’application va redémarrer.`,
        confirmLabel: 'Restaurer et redémarrer'
      })
      if (!confirmed) return { status: 'cancelled' }

      const safety = await deps.backup.create('avant-restauration')
      logger.info({ source, safety: safety.path }, 'restauration : données actuelles sauvegardées')

      const { dbPath } = deps.paths
      const tmp = `${dbPath}.restore-tmp`
      deps.closeDatabase()
      try {
        deps.fs.copyFile(source, tmp)
        // Un ancien journal WAL appliqué au nouveau fichier le corromprait
        deps.fs.remove(`${dbPath}-wal`)
        deps.fs.remove(`${dbPath}-shm`)
        deps.fs.rename(tmp, dbPath)
        logger.info({ source }, 'restauration effectuée, redémarrage')
      } catch (err) {
        deps.fs.remove(tmp)
        logger.error({ err, source, safety: safety.path }, 'restauration échouée')
        throw err
      } finally {
        // Base fermée dans tous les cas : seul un redémarrage remet l'app dans un état sûr
        deps.system.scheduleRelaunch()
      }
      return { status: 'restarting' }
    },

    openLogsFolder(): Promise<void> {
      return deps.system.openFolder(deps.paths.logsDir)
    },

    async openBackupsFolder(): Promise<void> {
      deps.fs.ensureDir(deps.paths.backupsDir)
      await deps.system.openFolder(deps.paths.backupsDir)
    }
  }
}

export type MaintenanceService = ReturnType<typeof createMaintenanceService>
