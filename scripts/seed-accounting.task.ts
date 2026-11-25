/**
 * `npm run seed:accounting` : crée une base de démonstration avec le plan comptable réel
 * (budget 2025, réalisations datées à des jours différents) dans `.dev-data/seed/`, dossier
 * SÉPARÉ de la base de dev habituelle (jamais touchée). La base est recréée à chaque lancement.
 * Ensuite : `npm run dev:seed` ouvre l'application sur cette base.
 *
 * Lancé via Vitest (projet "seed") pour réutiliser les alias et le runtime Electron.
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { openDatabase } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createAccountingRepository } from '@main/repositories/accounting.repository'
import { createAccountingService } from '@main/services/accounting.service'
import { seedChurchPlan } from '@tests/factories/accounting.seed'
import { MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

// `SEED_DIR` : autre dossier (tests E2E) ; par défaut .dev-data/seed
const SEED_DIR = resolve(process.env['SEED_DIR'] ?? resolve(__dirname, '../.dev-data/seed'))

it('crée la base de démonstration du plan comptable 2025', () => {
  mkdirSync(SEED_DIR, { recursive: true })
  const dbFile = join(SEED_DIR, 'data.db')
  // Dossier réservé au seed : on repart d'une base vide à chaque fois
  for (const f of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) rmSync(f, { force: true })

  const handle = openDatabase(dbFile)
  runMigrations(handle, MIGRATIONS_FOLDER)
  const clock = createFixedClock(new Date('2025-01-05T07:00:00.000Z'))
  const service = createAccountingService({
    db: handle.db,
    accounting: createAccountingRepository(),
    clock,
    logger: createLogger(createMemorySink())
  })
  const summary = seedChurchPlan(service, clock)
  handle.sqlite.close()

  console.info(
    `Base de démonstration : ${dbFile}\n` +
      `${summary.items} rubriques, ${summary.entries} saisies, ${summary.detailedCells} cases détaillées.\n` +
      'Ouvrir l’application dessus : npm run dev:seed'
  )
  expect(existsSync(dbFile)).toBe(true)
})
