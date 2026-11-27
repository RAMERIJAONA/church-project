/**
 * `npm run seed:members` : 500 fidèles FICTIFS (`tests/factories/members.demo-seed.ts`) dans la
 * base de démonstration `.dev-data/seed/` (ou `SEED_DIR`). Ne touche QUE la table `members` :
 * les données de comptabilité de cette base (`npm run seed:accounting`) restent intactes.
 * Ensuite : `npm run dev:seed` ouvre l'application sur cette base.
 *
 * Lancé via Vitest (projet "seed-members") pour réutiliser les alias et le runtime Electron.
 */
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { openDatabase } from '@main/db/client'
import { runMigrations } from '@main/db/migrate'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createMembersRepository } from '@main/repositories/members.repository'
import { createMembersService } from '@main/services/members.service'
import { seedMembers } from '@tests/factories/members.demo-seed'
import { MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

const SEED_DIR = resolve(process.env['SEED_DIR'] ?? resolve(__dirname, '../.dev-data/seed'))
const COUNT = 500

it('remplit les fidèles de la base de démonstration', () => {
  mkdirSync(SEED_DIR, { recursive: true })
  const dbFile = join(SEED_DIR, 'data.db')
  const handle = openDatabase(dbFile)
  runMigrations(handle, MIGRATIONS_FOLDER)
  // Seule la table des fidèles est vidée (base réservée à la démonstration)
  handle.sqlite.exec('DELETE FROM members')
  const service = createMembersService({
    db: handle.db,
    members: createMembersRepository(),
    clock: createFixedClock(new Date()),
    logger: createLogger(createMemorySink())
  })
  const created = seedMembers(service, COUNT)
  const total = handle.sqlite.prepare('SELECT count(*) FROM members').pluck().get()
  handle.sqlite.close()

  console.info(
    `Base de démonstration : ${dbFile}\n${created} fidèles fictifs.\n` +
      'Ouvrir l’application dessus : npm run dev:seed'
  )
  expect(total).toBe(COUNT)
})
