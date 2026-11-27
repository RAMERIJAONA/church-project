/**
 * Garde-fous SQL des fidèles, foyers et secteurs (migrations 0006 à 0009) : la base refuse ce
 * que le service refuse déjà, en dernier recours. SQL brut pour tester la base seule.
 */
import { describe, expect, it } from 'vitest'
import type { Sqlite } from '@main/db/client'
import { createTestDb } from '@tests/helpers/test-db'

const NOW = '2026-11-27T09:00:00.000Z'

function sector(sqlite: Sqlite, number: number, name: string): number {
  return Number(
    sqlite
      .prepare(`INSERT INTO sectors (number, name, created_at, updated_at) VALUES (?, ?, ?, ?)`)
      .run(number, name, NOW, NOW).lastInsertRowid
  )
}

function household(sqlite: Sqlite, number: number, sectorId: number): number {
  return Number(
    sqlite
      .prepare(
        `INSERT INTO households (number, sector_id, created_at, updated_at) VALUES (?, ?, ?, ?)`
      )
      .run(number, sectorId, NOW, NOW).lastInsertRowid
  )
}

/** Base avec un secteur I et un foyer 1. */
function setup(): { sqlite: Sqlite; householdId: number } {
  const { sqlite } = createTestDb()
  const householdId = household(sqlite, 1, sector(sqlite, 1, 'Ambodimanga'))
  return { sqlite, householdId }
}

function insert(
  sqlite: Sqlite,
  householdId: number,
  values: {
    role?: 'head' | 'father' | 'mother' | 'child'
    rank?: number
    sex?: 'M' | 'F'
    baptized?: 0 | 1
    communicant?: 0 | 1
    deacon?: 0 | 1
    deletedAt?: string | null
    firstName?: string
  } = {}
): void {
  sqlite
    .prepare(
      `INSERT INTO members (household_id, role, rank, sex, last_name, first_name, birth_date,
         address, baptized, communicant, deacon, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, 'RAKOTO', ?, '1985-03-12', 'Ambatondrazaka', ?, ?, ?, ?, ?, ?)`
    )
    .run(
      householdId,
      values.role ?? 'child',
      values.rank ?? 3,
      values.sex ?? 'M',
      values.firstName ?? 'Tiana',
      values.baptized ?? 0,
      values.communicant ?? 0,
      values.deacon ?? 0,
      NOW,
      NOW,
      values.deletedAt ?? null
    )
}

describe('table members', () => {
  it('accepte un fidèle valide', () => {
    const { sqlite, householdId } = setup()
    insert(sqlite, householdId, { role: 'father', rank: 1, baptized: 1, communicant: 1, deacon: 1 })
    expect(sqlite.prepare('SELECT count(*) FROM members').pluck().get()).toBe(1)
  })

  it('refuse un fidèle sans foyer existant', () => {
    const { sqlite } = setup()
    expect(() => insert(sqlite, 999)).toThrow(/FOREIGN KEY constraint failed/)
  })

  it('refuse un communiant non baptisé', () => {
    const { sqlite, householdId } = setup()
    expect(() => insert(sqlite, householdId, { baptized: 0, communicant: 1 })).toThrow(
      /CHECK constraint failed/
    )
  })

  it('refuse un diacre non communiant', () => {
    const { sqlite, householdId } = setup()
    expect(() => insert(sqlite, householdId, { baptized: 1, communicant: 0, deacon: 1 })).toThrow(
      /CHECK constraint failed/
    )
  })

  it('refuse un rang incohérent avec le rôle', () => {
    const { sqlite, householdId } = setup()
    expect(() => insert(sqlite, householdId, { role: 'mother', rank: 3, sex: 'F' })).toThrow(
      /CHECK constraint failed/
    )
    expect(() => insert(sqlite, householdId, { role: 'child', rank: 2 })).toThrow(
      /CHECK constraint failed/
    )
    expect(() => insert(sqlite, householdId, { role: 'head', rank: 2 })).toThrow(
      /CHECK constraint failed/
    )
  })

  it('refuse un père de sexe féminin et une mère de sexe masculin', () => {
    const { sqlite, householdId } = setup()
    expect(() => insert(sqlite, householdId, { role: 'father', rank: 1, sex: 'F' })).toThrow(
      /CHECK constraint failed/
    )
    expect(() => insert(sqlite, householdId, { role: 'mother', rank: 2, sex: 'M' })).toThrow(
      /CHECK constraint failed/
    )
  })

  it('refuse deux membres actifs au même rang du même foyer', () => {
    const { sqlite, householdId } = setup()
    insert(sqlite, householdId, { rank: 3 })
    expect(() => insert(sqlite, householdId, { rank: 3, firstName: 'Andry' })).toThrow(
      /UNIQUE constraint failed/
    )
  })

  it("réutilise le rang d'un membre supprimé", () => {
    const { sqlite, householdId } = setup()
    insert(sqlite, householdId, { rank: 3, deletedAt: NOW })
    expect(() => insert(sqlite, householdId, { rank: 3, firstName: 'Andry' })).not.toThrow()
  })

  it('refuse deux fidèles actifs de même nom et prénom', () => {
    const { sqlite, householdId } = setup()
    insert(sqlite, householdId, { rank: 3 })
    expect(() => insert(sqlite, householdId, { rank: 4 })).toThrow(/UNIQUE constraint failed/)
  })

  it("réutilise le nom et le prénom d'un fidèle supprimé", () => {
    const { sqlite, householdId } = setup()
    insert(sqlite, householdId, { rank: 3, deletedAt: NOW })
    expect(() => insert(sqlite, householdId, { rank: 4 })).not.toThrow()
  })
})

describe('tables sectors et households', () => {
  it('refuse deux secteurs de même nom à la casse près', () => {
    const { sqlite } = setup()
    expect(() => sector(sqlite, 2, 'AMBODIMANGA')).toThrow(/UNIQUE constraint failed/)
  })

  it('refuse deux secteurs de même numéro', () => {
    const { sqlite } = setup()
    expect(() => sector(sqlite, 1, 'Antanety')).toThrow(/UNIQUE constraint failed/)
  })

  it('refuse deux foyers de même numéro, même supprimé', () => {
    const { sqlite } = setup()
    sqlite.prepare('UPDATE households SET deleted_at = ? WHERE number = 1').run(NOW)
    const sectorId = sqlite.prepare('SELECT id FROM sectors').pluck().get() as number
    expect(() => household(sqlite, 1, sectorId)).toThrow(/UNIQUE constraint failed/)
  })

  it('refuse un parrain qui n’est pas un fidèle', () => {
    const { sqlite, householdId } = setup()
    expect(() =>
      sqlite.prepare('UPDATE households SET sponsor_id = 999 WHERE id = ?').run(householdId)
    ).toThrow(/FOREIGN KEY constraint failed/)
  })
})
