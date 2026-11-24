import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { readMigrationFiles, type MigrationMeta } from 'drizzle-orm/migrator'
import type { DbHandle, Sqlite } from './client'

/** Table de suivi utilisée par le migrator Drizzle 0.45 (created_at = horodatage du journal). */
export const MIGRATIONS_TABLE = '__drizzle_migrations'

function lastAppliedMillis(sqlite: Sqlite): number | null {
  const table = sqlite
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(MIGRATIONS_TABLE)
  if (!table) return null
  const row = sqlite
    .prepare(`SELECT created_at FROM "${MIGRATIONS_TABLE}" ORDER BY created_at DESC LIMIT 1`)
    .get() as { created_at: number | string } | undefined
  return row ? Number(row.created_at) : null
}

/** Vrai si la base a déjà reçu au moins une migration (= base existante, avec des données). */
export function hasAppliedMigrations(sqlite: Sqlite): boolean {
  return lastAppliedMillis(sqlite) !== null
}

/** Même critère que le migrator Drizzle : tout ce qui est plus récent que la dernière appliquée. */
export function getPendingMigrations(sqlite: Sqlite, migrationsFolder: string): MigrationMeta[] {
  const last = lastAppliedMillis(sqlite)
  return readMigrationFiles({ migrationsFolder }).filter(
    (m) => last === null || m.folderMillis > last
  )
}

export class MigrationIntegrityError extends Error {
  constructor(readonly violations: unknown[]) {
    super(`Violations de clés étrangères après migration (${violations.length})`)
    this.name = 'MigrationIntegrityError'
  }
}

/**
 * Applique les migrations en attente. Le migrator Drizzle (better-sqlite3) est synchrone et
 * exécute toutes les migrations en attente dans UNE transaction (rollback complet en cas d'erreur).
 * Ensuite : contrôle des clés étrangères, car `PRAGMA foreign_keys` est sans effet dans une
 * transaction (les migrations qui recréent une table peuvent donc laisser des orphelins).
 */
export function runMigrations(handle: DbHandle, migrationsFolder: string): { applied: number } {
  const pending = getPendingMigrations(handle.sqlite, migrationsFolder)
  if (pending.length === 0) return { applied: 0 }
  migrate(handle.db, { migrationsFolder, migrationsTable: MIGRATIONS_TABLE })
  const violations = handle.sqlite.pragma('foreign_key_check') as unknown[]
  if (violations.length > 0) throw new MigrationIntegrityError(violations)
  return { applied: pending.length }
}
