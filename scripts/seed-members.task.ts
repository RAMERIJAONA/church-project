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
import { createHouseholdsService } from '@main/services/households.service'
import { createMembersService } from '@main/services/members.service'
import { createSectorsService } from '@main/services/sectors.service'
import { DEMO_MEMBERS_COUNT, seedDemoMembers } from '@tests/factories/members.demo-seed'
import { MIGRATIONS_FOLDER } from '@tests/helpers/test-db'

const SEED_DIR = resolve(process.env['SEED_DIR'] ?? resolve(__dirname, '../.dev-data/seed'))
const COUNT = DEMO_MEMBERS_COUNT

// Environ 11 s sur le Mac de développement (10 000 fidèles, 2 275 foyers, par les services)
it('remplit les fidèles de la base de démonstration', { timeout: 120_000 }, () => {
  mkdirSync(SEED_DIR, { recursive: true })
  const dbFile = join(SEED_DIR, 'data.db')
  const handle = openDatabase(dbFile)
  // Fidèles vidés AVANT les migrations (base réservée à la démonstration) : d'anciens fidèles
  // de démonstration homonymes feraient échouer l'index unique nom + prénom (migration 0007).
  // Une base déjà en 0009 a des parrains : liens retirés d'abord.
  const hasTable = (name: string): boolean =>
    handle.sqlite
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name) !== undefined
  if (hasTable('households')) handle.sqlite.exec('UPDATE households SET sponsor_id = NULL')
  if (hasTable('members')) handle.sqlite.exec('DELETE FROM members')
  runMigrations(handle, MIGRATIONS_FOLDER)
  // Fidèles, foyers et secteurs vidés (le parrain d'un foyer est un fidèle : liens retirés d'abord)
  handle.sqlite.exec(
    'UPDATE households SET sponsor_id = NULL; DELETE FROM members; DELETE FROM households; DELETE FROM sectors'
  )
  const clock = createFixedClock(new Date())
  const logger = createLogger(createMemorySink())
  const repos = {
    members: createMembersRepository(),
    households: createHouseholdsRepository(),
    sectors: createSectorsRepository()
  }
  const members = createMembersService({ db: handle.db, ...repos, clock, logger })
  const households = createHouseholdsService({
    db: handle.db,
    ...repos,
    clock,
    logger,
    memberSearch: (q) => members.searchEntries(q),
    onChange: () => members.invalidate()
  })
  const sectors = createSectorsService({ db: handle.db, sectors: repos.sectors, clock, logger })
  const created = seedDemoMembers({ sectors, households, members }, COUNT)
  const total = handle.sqlite.prepare('SELECT count(*) FROM members').pluck().get()
  handle.sqlite.close()

  console.info(
    `Base de démonstration : ${dbFile}\n${created.members} fidèles fictifs, ` +
      `${created.households} foyers, ${created.sectors} secteurs.\n` +
      'Ouvrir l’application dessus : npm run dev:seed'
  )
  expect(total).toBe(COUNT)
})
