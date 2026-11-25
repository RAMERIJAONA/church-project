/**
 * `npm run seed:accounting` : crée une GRANDE base de démonstration (plan fictif en français,
 * montants en Ariary sur 6 années, cf. `tests/factories/accounting.demo-seed.ts`) dans
 * `.dev-data/seed/`, dossier SÉPARÉ de la base de dev habituelle (jamais touchée). La base est
 * recréée à chaque lancement, datée par rapport à aujourd'hui (cartes « Aujourd'hui »…).
 * Ensuite : `npm run dev:seed` ouvre l'application sur cette base.
 * Le plan réel 2025 de l'église reste dans `tests/fixtures/accounting/church-plan-2025.ts`
 * (contrôle de la numérotation, `tests/integration/accounting.seed.test.ts`).
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
import { localDateOf } from '@shared/domain/accounting/accounting.periods'
import { seedDemo } from '@tests/factories/accounting.demo-seed'
import { MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

// `SEED_DIR` : autre dossier (tests E2E) ; par défaut .dev-data/seed
const SEED_DIR = resolve(process.env['SEED_DIR'] ?? resolve(__dirname, '../.dev-data/seed'))

it('crée la grande base de démonstration', () => {
  mkdirSync(SEED_DIR, { recursive: true })
  const dbFile = join(SEED_DIR, 'data.db')
  // Dossier réservé au seed : on repart d'une base vide à chaque fois
  for (const f of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) rmSync(f, { force: true })

  const handle = openDatabase(dbFile)
  runMigrations(handle, MIGRATIONS_FOLDER)
  const clock = createFixedClock(new Date())
  const service = createAccountingService({
    db: handle.db,
    accounting: createAccountingRepository(),
    clock,
    logger: createLogger(createMemorySink())
  })
  const summary = seedDemo(service, clock, localDateOf(new Date()))
  handle.sqlite.close()

  console.info(
    `Base de démonstration : ${dbFile}\n` +
      `${summary.items} rubriques, ${summary.entries} saisies (${summary.years.join(' à ')}), ` +
      `${summary.detailedCells} cases détaillées, ${summary.modifiedEntries} modifiées, ` +
      `${summary.deletedEntries} supprimées, ${summary.lateEntries} tardives.\n` +
      'Ouvrir l’application dessus : npm run dev:seed'
  )
  expect(existsSync(dbFile)).toBe(true)
})
