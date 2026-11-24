import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type Db = BetterSQLite3Database<typeof schema>
export type Sqlite = Database.Database
/** Transaction synchrone Drizzle (better-sqlite3). */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
/** Les repositories acceptent la base ou une transaction en cours. */
export type DbOrTx = Db | Tx

export interface DbHandle {
  sqlite: Sqlite
  db: Db
}

/** Pragmas appliqués à chaque ouverture (CLAUDE.md par. 7). */
export function applyPragmas(sqlite: Sqlite): void {
  // WAL n'a pas de sens en mémoire (SQLite reste en "memory") : sans effet, sans erreur.
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('busy_timeout = 5000')
}

/** Ouvre (ou crée) la base. `filePath` = ':memory:' pour les tests. */
export function openDatabase(filePath: string): DbHandle {
  const sqlite = new Database(filePath)
  applyPragmas(sqlite)
  const db = drizzle(sqlite, { schema })
  return { sqlite, db }
}
