/**
 * `npm run fixture:snapshot` : génère tests/fixtures/db/v<version>.db + son manifeste JSON
 * (nombre de lignes par table) à partir des factories, avec les migrations actuelles.
 * À lancer à chaque release, AVANT de modifier le schéma pour la version suivante.
 * Une fixture publiée n'est jamais régénérée (comme une migration).
 *
 * Lancé via Vitest (projet "fixtures") pour réutiliser les alias et le runtime Electron.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { openDatabase } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'
import { makeSettings } from '@tests/factories/settings.factory'
import { seedSettings } from '@tests/factories/settings.seed'
import { MIGRATIONS_FOLDER } from '@tests/helpers/test-db'
import { countRowsPerTable } from '@tests/helpers/db-inspect'
import pkg from '../package.json'

const FIXTURES_DIR = resolve(__dirname, '../tests/fixtures/db')

it(`génère la fixture v${pkg.version}`, () => {
  const dbFile = resolve(FIXTURES_DIR, `v${pkg.version}.db`)
  const manifestFile = resolve(FIXTURES_DIR, `v${pkg.version}.json`)
  if (existsSync(dbFile)) {
    throw new Error(`La fixture ${dbFile} existe déjà : une fixture publiée ne se régénère pas.`)
  }
  mkdirSync(FIXTURES_DIR, { recursive: true })

  const handle = openDatabase(dbFile)
  runMigrations(handle, MIGRATIONS_FOLDER)

  // Données réalistes et anonymisées (aucune donnée réelle d'utilisateur)
  seedSettings(handle, makeSettings({ theme: 'dark', accent: 'green', density: 'compact' }))

  const tables = countRowsPerTable(handle.sqlite)
  handle.sqlite.pragma('journal_mode = DELETE') // fichier unique, sans -wal/-shm
  handle.sqlite.exec('VACUUM')
  handle.sqlite.close()

  writeFileSync(
    manifestFile,
    JSON.stringify(
      { version: pkg.version, generatedAt: new Date().toISOString(), tables },
      null,
      2
    ) + '\n'
  )
  expect(existsSync(dbFile)).toBe(true)
})
