import { join } from 'node:path'
import type { Clock } from '@main/adapters/clock.adapter'
import type { FsAdapter } from '@main/adapters/fs.adapter'
import type { Sqlite } from '@main/db/client'
import type { Logger } from '@main/logging/logger'

export type BackupReason = 'auto' | 'avant-migration' | 'avant-restauration' | 'manuel'

export interface BackupInfo {
  fileName: string
  path: string
  size: number
  createdAt: Date
}

const PREFIX = 'sauvegarde_'
const EXT = '.db'
const DAY_MS = 24 * 60 * 60 * 1000

const pad = (n: number): string => String(n).padStart(2, '0')

/** `sauvegarde_2026-11-24_14-05-09_auto.db` (heure locale : le fichier est lu par l'utilisateur). */
export function backupFileName(date: Date, reason: BackupReason): string {
  const d = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const t = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  return `${PREFIX}${d}_${t}_${reason}${EXT}`
}

export function createBackupService(deps: {
  sqlite: Sqlite
  fs: FsAdapter
  backupsDir: string
  clock: Clock
  logger: Logger
  keep?: number
}) {
  const keep = deps.keep ?? 14

  function list(): BackupInfo[] {
    return deps.fs
      .listFiles(deps.backupsDir)
      .filter((f) => f.name.startsWith(PREFIX) && f.name.endsWith(EXT))
      .map((f) => ({ fileName: f.name, path: f.path, size: f.size, createdAt: f.modifiedAt }))
      .sort((a, b) => b.fileName.localeCompare(a.fileName)) // nom horodaté → plus récent d'abord
  }

  function rotate(): number {
    const extra = list().slice(keep)
    for (const b of extra) deps.fs.remove(b.path)
    if (extra.length > 0)
      deps.logger.info({ removed: extra.length, keep }, 'rotation des sauvegardes')
    return extra.length
  }

  /** Copie cohérente de la base ouverte vers `destination` (API backup de SQLite, sûre en WAL). */
  async function backupTo(destination: string): Promise<void> {
    await deps.sqlite.backup(destination)
  }

  return {
    list,
    rotate,
    backupTo,

    /** Sauvegarde dans le dossier des sauvegardes, puis rotation. */
    async create(reason: BackupReason): Promise<BackupInfo> {
      deps.fs.ensureDir(deps.backupsDir)
      const fileName = backupFileName(deps.clock(), reason)
      const path = join(deps.backupsDir, fileName)
      await backupTo(path)
      deps.logger.info({ path, reason }, 'sauvegarde créée')
      rotate()
      const created = list().find((b) => b.fileName === fileName)
      if (!created) throw new Error(`Sauvegarde introuvable après création : ${path}`)
      return created
    },

    /** Vrai s'il n'existe aucune sauvegarde de moins de 24 h. */
    isAutoBackupDue(): boolean {
      const latest = list()[0]
      return !latest || deps.clock().getTime() - latest.createdAt.getTime() >= DAY_MS
    }
  }
}

export type BackupService = ReturnType<typeof createBackupService>
