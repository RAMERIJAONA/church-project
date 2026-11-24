import { cpSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { openDatabase, type DbHandle } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'
import { createTempDir } from './temp-dir'

export const MIGRATIONS_FOLDER = resolve(__dirname, '../../drizzle')

/** SQLite en mémoire + TOUTES les migrations réelles (jamais un schéma recréé à la main). */
export function createTestDb(): DbHandle {
  const handle = openDatabase(':memory:')
  runMigrations(handle, MIGRATIONS_FOLDER)
  return handle
}

interface Journal {
  entries: Array<{ tag: string }>
}

/**
 * Copie de drizzle/ dont le journal s'arrête à `tag` inclus : schéma d'une version précédente,
 * pour tester une migration sur des données existantes. `cleanup()` supprime la copie.
 */
export function migrationsUpTo(tag: string): { dir: string; cleanup: () => void } {
  const tmp = createTempDir()
  cpSync(MIGRATIONS_FOLDER, tmp.dir, { recursive: true })
  const journalPath = join(tmp.dir, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal
  const index = journal.entries.findIndex((e) => e.tag === tag)
  if (index < 0) {
    tmp.cleanup()
    throw new Error(`Migration inconnue : ${tag}`)
  }
  journal.entries = journal.entries.slice(0, index + 1)
  writeFileSync(journalPath, JSON.stringify(journal))
  return tmp
}

/** Tag de l'avant-dernière migration (= schéma de la version précédente). */
export function previousMigrationTag(): string {
  const journal = JSON.parse(
    readFileSync(join(MIGRATIONS_FOLDER, 'meta', '_journal.json'), 'utf8')
  ) as Journal
  const entry = journal.entries.at(-2)
  if (!entry) throw new Error('Il faut au moins deux migrations')
  return entry.tag
}
