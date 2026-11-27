import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createSectorsRepository } from '@main/repositories/sectors.repository'
import { createSectorsService } from '@main/services/sectors.service'
import { AppError } from '@shared/domain/errors'
import {
  createSectorInputSchema,
  renameSectorInputSchema
} from '@shared/domain/members/sectors.types'
import { createTestDb } from '@tests/helpers/test-db'

function setup() {
  const handle = createTestDb()
  const service = createSectorsService({
    db: handle.db,
    sectors: createSectorsRepository(),
    clock: createFixedClock(new Date('2026-11-27T09:00:00.000Z')),
    logger: createLogger(createMemorySink())
  })
  const create = (name: string) => service.create(createSectorInputSchema.parse({ name }))
  const rename = (id: number, name: string) =>
    service.rename(renameSectorInputSchema.parse({ id, name }))
  return { service, create, rename }
}

function errorOf(fn: () => unknown): AppError {
  try {
    fn()
  } catch (err) {
    if (err instanceof AppError) return err
    throw err
  }
  throw new Error('aucune erreur levée')
}

describe('secteurs', () => {
  it('numérote I, II, III dans l’ordre de création', () => {
    const { service, create } = setup()
    create('Ambodimanga')
    create('Antanety')
    create('Morarano')
    expect(service.list().map((s) => [s.number, s.numeral, s.name])).toEqual([
      [1, 'I', 'Ambodimanga'],
      [2, 'II', 'Antanety'],
      [3, 'III', 'Morarano']
    ])
  })

  it('garde le numéro quand on renomme', () => {
    const { service, create, rename } = setup()
    create('Ambodimanga')
    const antanety = create('Antanety')
    const renamed = rename(antanety.id, 'antanety atsimo')
    expect(renamed).toMatchObject({ number: 2, numeral: 'II', name: 'Antanety Atsimo' })
    expect(service.list().map((s) => s.numeral)).toEqual(['I', 'II'])
  })

  it('met le nom en forme', () => {
    const { create } = setup()
    expect(create('  ambohitsara   avaratra ').name).toBe('Ambohitsara Avaratra')
  })

  it('refuse un nom déjà pris, sans tenir compte de la casse', () => {
    const { create } = setup()
    create('Morarano')
    create('Ambodimanga')
    const err = errorOf(() => create('AMBODIMANGA'))
    expect(err.code).toBe('CONFLICT')
    expect(err.message).toBe('Le secteur Ambodimanga existe déjà (n° II).')
  })

  it('accepte de renommer un secteur avec son propre nom autrement écrit', () => {
    const { create, rename } = setup()
    const s = create('Ambodimanga')
    expect(rename(s.id, 'AMBODIMANGA').name).toBe('Ambodimanga')
  })

  it('refuse de renommer un secteur inconnu', () => {
    const { rename } = setup()
    expect(errorOf(() => rename(99, 'Antanety')).code).toBe('NOT_FOUND')
  })

  it('compte zéro foyer et zéro fidèle pour un secteur neuf', () => {
    const { create } = setup()
    expect(create('Antanety')).toMatchObject({ householdCount: 0, memberCount: 0 })
  })
})
