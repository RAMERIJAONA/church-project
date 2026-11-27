/**
 * `npm run seed:members` : 10 000 fidèles FICTIFS (`tests/factories/members.demo-seed.ts`) dans la
 * base de démonstration `.dev-data/seed/` (ou `SEED_DIR`). Ne touche QUE les fidèles, foyers et
 * secteurs :
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
import { createHouseholdsRepository } from '@main/repositories/households.repository'
import { createMembersRepository } from '@main/repositories/members.repository'
import { createSectorsRepository } from '@main/repositories/sectors.repository'
import { createMembersService } from '@main/services/members.service'
import { createSectorsService } from '@main/services/sectors.service'
import { createSectorInputSchema } from '@shared/domain/members/sectors.types'
import { DEMO_MEMBERS_COUNT, seedMembers } from '@tests/factories/members.demo-seed'
import { MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

const SEED_DIR = resolve(process.env['SEED_DIR'] ?? resolve(__dirname, '../.dev-data/seed'))
const COUNT = DEMO_MEMBERS_COUNT

it('remplit les fidèles de la base de démonstration', () => {
  mkdirSync(SEED_DIR, { recursive: true })
  const dbFile = join(SEED_DIR, 'data.db')
  const handle = openDatabase(dbFile)
  // Seule la table des fidèles est vidée (base réservée à la démonstration), AVANT les
  // migrations : d'anciens fidèles de démonstration homonymes feraient échouer l'index unique
  // nom + prénom (migration 0007)
  const hasMembers = handle.sqlite
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'members'")
    .get()
  if (hasMembers) handle.sqlite.exec('DELETE FROM members')
  runMigrations(handle, MIGRATIONS_FOLDER)
  // Fidèles, foyers et secteurs vidés (le parrain d'un foyer est un fidèle : liens retirés d'abord)
  handle.sqlite.exec(
    'UPDATE households SET sponsor_id = NULL; DELETE FROM members; DELETE FROM households; DELETE FROM sectors'
  )
  const clock = createFixedClock(new Date())
  const logger = createLogger(createMemorySink())
  const households = createHouseholdsRepository()
  const service = createMembersService({
    db: handle.db,
    members: createMembersRepository(),
    households,
    clock,
    logger
  })
  const sector = createSectorsService({
    db: handle.db,
    sectors: createSectorsRepository(),
    clock,
    logger
  }).create(createSectorInputSchema.parse({ name: 'Ambodimanga' }))
  const householdId = households.insert(handle.db, {
    number: 1,
    sectorId: sector.id,
    sponsorId: null,
    createdAt: clock().toISOString()
  })
  const created = seedMembers(service, COUNT, householdId)
  const total = handle.sqlite.prepare('SELECT count(*) FROM members').pluck().get()
  handle.sqlite.close()

  console.info(
    `Base de démonstration : ${dbFile}\n${created} fidèles fictifs.\n` +
      'Ouvrir l’application dessus : npm run dev:seed'
  )
  expect(total).toBe(COUNT)
})
