import Database from 'better-sqlite3'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { MIGRATIONS_TABLE } from './migrate'

export interface DatabaseFileReport {
  /** Fichier SQLite lisible et `PRAGMA integrity_check` = ok */
  readable: boolean
  /** Contient les tables d'une base de l'application */
  isAppDatabase: boolean
  /** Horodatage de la dernière migration appliquée dans ce fichier */
  lastMigrationMillis: number | null
  /** Horodatage de la dernière migration connue de CETTE version de l'app */
  latestKnownMigrationMillis: number | null
  error?: string
}

const REQUIRED_TABLES = [MIGRATIONS_TABLE, 'settings']

/** Inspection en lecture seule d'un fichier candidat (restauration). Ne modifie jamais le fichier. */
export function inspectDatabaseFile(path: string, migrationsFolder: string): DatabaseFileReport {
  const known = readMigrationFiles({ migrationsFolder }).map((m) => m.folderMillis)
  const latestKnownMigrationMillis = known.length > 0 ? Math.max(...known) : null
  let db: Database.Database | null = null
  try {
    db = new Database(path, { readonly: true, fileMustExist: true })
    const integrity = db.pragma('integrity_check', { simple: true })
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .pluck()
      .all() as string[]
    const isAppDatabase = REQUIRED_TABLES.every((t) => tables.includes(t))
    const last = isAppDatabase
      ? (db.prepare(`SELECT MAX(created_at) FROM "${MIGRATIONS_TABLE}"`).pluck().get() as
          number | string | null)
      : null
    return {
      readable: integrity === 'ok',
      isAppDatabase,
      lastMigrationMillis: last === null ? null : Number(last),
      latestKnownMigrationMillis
    }
  } catch (err) {
    return {
      readable: false,
      isAppDatabase: false,
      lastMigrationMillis: null,
      latestKnownMigrationMillis,
      error: err instanceof Error ? err.message : String(err)
    }
  } finally {
    db?.close()
  }
}
