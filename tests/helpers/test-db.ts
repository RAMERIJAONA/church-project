import { resolve } from 'node:path'
import { openDatabase, type DbHandle } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'

export const MIGRATIONS_FOLDER = resolve(__dirname, '../../drizzle')

/** SQLite en mémoire + TOUTES les migrations réelles (jamais un schéma recréé à la main). */
export function createTestDb(): DbHandle {
  const handle = openDatabase(':memory:')
  runMigrations(handle, MIGRATIONS_FOLDER)
  return handle
}
