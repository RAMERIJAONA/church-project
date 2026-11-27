/**
 * Garde-fous SQL de la table `members` (migration 0006) : la base refuse ce que le service
 * refuse déjà, en dernier recours. SQL brut pour tester la base seule.
 */
import { describe, expect, it } from 'vitest'
import { createTestDb } from '@tests/helpers/test-db'

const NOW = '2026-11-27T09:00:00.000Z'

function insert(
  sqlite: ReturnType<typeof createTestDb>['sqlite'],
  values: {
    registration?: string | null
    baptized?: 0 | 1
    communicant?: 0 | 1
    deletedAt?: string | null
    firstName?: string
  }
): void {
  sqlite
    .prepare(
      `INSERT INTO members (last_name, first_name, birth_date, address, baptized, communicant,
         registration_number, created_at, updated_at, deleted_at)
       VALUES ('RAKOTO', ?, '1985-03-12', 'Ambatondrazaka', ?, ?, ?, ?, ?, ?)`
    )
    .run(
      values.firstName ?? 'Tiana',
      values.baptized ?? 0,
      values.communicant ?? 0,
      values.registration ?? null,
      NOW,
      NOW,
      values.deletedAt ?? null
    )
}

describe('table members', () => {
  it('accepte un fidèle valide', () => {
    const { sqlite } = createTestDb()
    insert(sqlite, { baptized: 1, communicant: 1 })
    expect(sqlite.prepare('SELECT count(*) FROM members').pluck().get()).toBe(1)
  })

  it('refuse un communiant non baptisé', () => {
    const { sqlite } = createTestDb()
    expect(() => insert(sqlite, { baptized: 0, communicant: 1 })).toThrow(/CHECK constraint failed/)
  })

  it('refuse deux matricules identiques à la casse près parmi les fidèles actifs', () => {
    const { sqlite } = createTestDb()
    insert(sqlite, { registration: 'm-1' })
    expect(() => insert(sqlite, { registration: 'M-1', firstName: 'Andry' })).toThrow(
      /UNIQUE constraint failed/
    )
  })

  it("réutilise le matricule d'un fidèle supprimé", () => {
    const { sqlite } = createTestDb()
    insert(sqlite, { registration: 'M-1', deletedAt: NOW })
    expect(() => insert(sqlite, { registration: 'M-1', firstName: 'Andry' })).not.toThrow()
  })

  it('accepte plusieurs fidèles sans matricule', () => {
    const { sqlite } = createTestDb()
    insert(sqlite, {})
    expect(() => insert(sqlite, { firstName: 'Andry' })).not.toThrow()
  })

  it('refuse deux fidèles actifs de même nom et prénom', () => {
    const { sqlite } = createTestDb()
    insert(sqlite, {})
    expect(() => insert(sqlite, {})).toThrow(/UNIQUE constraint failed/)
  })

  it("réutilise le nom et le prénom d'un fidèle supprimé", () => {
    const { sqlite } = createTestDb()
    insert(sqlite, { deletedAt: NOW })
    expect(() => insert(sqlite, {})).not.toThrow()
  })
})
