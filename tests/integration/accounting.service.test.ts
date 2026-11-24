import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createAccountingRepository } from '@main/repositories/accounting.repository'
import { createAccountingService } from '@main/services/accounting.service'
import { findItem } from '@shared/domain/accounting/accounting.tree'
import type { AccountingItemDTO } from '@shared/domain/accounting/accounting.types'
import { AppError } from '@shared/domain/errors'
import { MAX_AMOUNT } from '@shared/utils/money'
import { makeChildInput, makeRootInput } from '@tests/factories/accounting.factory'
import { createTestDb } from '@tests/helpers/test-db'

const YEAR = 2026
const T9 = '2026-11-24T09:00:00.000Z'
const T10 = '2026-11-24T10:00:00.000Z'

function setup() {
  const handle = createTestDb()
  const clock = createFixedClock(new Date(T9))
  const service = createAccountingService({
    db: handle.db,
    accounting: createAccountingRepository(),
    clock,
    logger: createLogger(createMemorySink())
  })
  const codes = (year = YEAR): string[] => {
    const out: string[] = []
    const walk = (items: AccountingItemDTO[]): void =>
      items.forEach((i) => {
        out.push(i.code)
        walk(i.children)
      })
    walk(service.getSheet(year).items)
    return out
  }
  const item = (id: number, year = YEAR) => findItem(service.getSheet(year), id)
  const child = (parentId: number, description = 'Sous-rubrique') =>
    service.createItem(makeChildInput({ parentId, description }))
  /** F1 ANATINY > {I > 1, II > 1 > {A), B)}} */
  const church = () => {
    for (const prefix of ['A', 'B', 'D', 'E']) service.createItem(makeRootInput({ prefix }))
    const f1 = service.createItem(makeRootInput({ prefix: 'F', description: 'anatiny' }))
    const i = child(f1.id, 'Mpitandrina')
    const i1 = child(i.id, 'Karama')
    const ii = child(f1.id, 'Trano Fiangonana')
    const ii1 = child(ii.id, 'Fanatsarana')
    const a = child(ii1.id, 'Trano Fiangonana (Kojakoja)')
    const b = child(ii1.id, 'Akany')
    return { f1, i, i1, ii, ii1, a, b }
  }
  return { handle, clock, service, codes, item, child, church }
}

const expectAppError = (fn: () => unknown, code: string): void => {
  try {
    fn()
  } catch (err) {
    expect(err).toBeInstanceOf(AppError)
    expect((err as AppError).code).toBe(code)
    return
  }
  throw new Error('AppError attendue')
}

const cell = { year: YEAR, type: 'actual' } as const

describe('AccountingService : arborescence', () => {
  it('renvoie un tableau vide sur une base neuve', () => {
    expect(setup().service.getSheet(YEAR)).toEqual({ year: YEAR, items: [] })
  })

  it('construit le plan de l’église sur 4 niveaux', () => {
    const { church, codes, item } = setup()
    const c = church()
    expect([c.f1, c.i, c.i1, c.ii, c.ii1, c.a, c.b].map((x) => x.code)).toEqual([
      'F1',
      'F1-I',
      'F1-I-1',
      'F1-II',
      'F1-II-1',
      'F1-II-1 A)',
      'F1-II-1 B)'
    ])
    expect(codes().slice(4)).toEqual([
      'F1',
      'F1-I',
      'F1-I-1',
      'F1-II',
      'F1-II-1',
      'F1-II-1 A)',
      'F1-II-1 B)'
    ])
    expect(item(c.f1.id)?.description).toBe('ANATINY')
    expect(item(c.i.id)?.description).toBe('Mpitandrina')
  })

  it('n’accepte au niveau 1 qu’une lettre utilisée ou la suivante', () => {
    const { service } = setup()
    service.createItem(makeRootInput({ prefix: 'A' }))
    expectAppError(() => service.createItem(makeRootInput({ prefix: 'D' })), 'BUSINESS_RULE')
    expect(service.createItem(makeRootInput({ prefix: 'A' })).code).toBe('A2')
    expect(service.createItem(makeRootInput({ prefix: 'B' })).code).toBe('B1')
  })

  it('refuse un 5e niveau', () => {
    const { church, child } = setup()
    const c = church()
    expectAppError(() => child(c.a.id), 'BUSINESS_RULE')
  })

  it('refuse un enfant sous un élément qui a des saisies, même d’une autre année', () => {
    const { church, child, service, item } = setup()
    const c = church()
    service.setTotal({ itemId: c.i1.id, year: 2025, type: 'estimate', amount: 1000 })
    expect(item(c.i1.id)?.canAddChild).toBe(false)
    expectAppError(() => child(c.i1.id), 'BUSINESS_RULE')
  })

  it('refuse un montant sur un groupe ou au niveau 1', () => {
    const { church, service } = setup()
    const c = church()
    for (const id of [c.f1.id, c.i.id]) {
      expectAppError(() => service.setTotal({ ...cell, itemId: id, amount: 1 }), 'BUSINESS_RULE')
      expectAppError(
        () => service.addEntry({ ...cell, itemId: id, amount: 1, label: null }),
        'BUSINESS_RULE'
      )
    }
  })

  it('supprime un groupe et toute sa descendance puis renumérote', () => {
    const { church, service, codes, item } = setup()
    const c = church()
    service.deleteItem(c.i.id)
    expect(item(c.i1.id)).toBeUndefined()
    expect(codes().slice(4)).toEqual(['F1', 'F1-I', 'F1-I-1', 'F1-I-1 A)', 'F1-I-1 B)'])
    expect(item(c.ii.id)?.code).toBe('F1-I')
    expectAppError(() => service.updateItem(c.i1.id, 'X'), 'NOT_FOUND')
  })

  it('déplace un élément parmi ses frères seulement', () => {
    const { church, service, item } = setup()
    const c = church()
    expect(service.moveItem(c.b.id, 'up')).toEqual({ moved: true })
    expect(item(c.b.id)?.code).toBe('F1-II-1 A)')
    expect(item(c.a.id)?.code).toBe('F1-II-1 B)')
    expect(service.moveItem(c.b.id, 'up')).toEqual({ moved: false })
    // F1-I-1 est seul sous F1-I : ne passe pas sous un autre parent
    expect(service.moveItem(c.i1.id, 'down')).toEqual({ moved: false })
    // Niveau 1 : seulement parmi la même lettre
    expect(service.moveItem(c.f1.id, 'up')).toEqual({ moved: false })
  })

  it('renomme en gardant les majuscules au niveau 1', () => {
    const { church, service, item } = setup()
    const c = church()
    service.updateItem(c.f1.id, 'anatiny vaovao')
    service.updateItem(c.i.id, 'Mpitandrina sy mpiandry')
    expect(item(c.f1.id)?.description).toBe('ANATINY VAOVAO')
    expect(item(c.i.id)?.description).toBe('Mpitandrina sy mpiandry')
  })

  it('signale NOT_FOUND pour un élément inexistant', () => {
    const { service } = setup()
    expectAppError(() => service.deleteItem(999), 'NOT_FOUND')
    expectAppError(() => service.createItem(makeChildInput({ parentId: 999 })), 'NOT_FOUND')
  })
})

describe('AccountingService : montants', () => {
  it('enregistre un total direct puis le modifie en gardant sa date de création', () => {
    const { church, service, clock, item } = setup()
    const { i1 } = church()
    service.setTotal({ ...cell, itemId: i1.id, amount: 500000 })
    clock.set(new Date(T10))
    service.setTotal({ ...cell, itemId: i1.id, amount: 600000 })
    expect(service.listEntries({ ...cell, itemId: i1.id })).toEqual([
      { id: expect.any(Number), amount: 600000, label: null, createdAt: T9, updatedAt: T10 }
    ])
    expect(item(i1.id)?.amounts?.actual).toEqual({ total: 600000, entryCount: 1, detailed: false })

    service.setTotal({ ...cell, itemId: i1.id, amount: null })
    expect(service.listEntries({ ...cell, itemId: i1.id })).toEqual([])
    expect(item(i1.id)?.amounts?.actual.total).toBeNull()
  })

  it('refuse un total direct sur une case détaillée', () => {
    const { church, service } = setup()
    const { i1 } = church()
    service.addEntry({ ...cell, itemId: i1.id, amount: 1000, label: 'Kojakoja' })
    expectAppError(() => service.setTotal({ ...cell, itemId: i1.id, amount: 5 }), 'BUSINESS_RULE')
    expect(service.listEntries({ ...cell, itemId: i1.id }).map((e) => e.amount)).toEqual([1000])
  })

  it('additionne les saisies détaillées et les liste par date de création', () => {
    const { church, service, clock, item } = setup()
    const { a } = church()
    clock.set(new Date(T10))
    service.addEntry({ ...cell, itemId: a.id, amount: 100000, label: 'Fanatsarana' })
    clock.set(new Date(T9))
    service.addEntry({ ...cell, itemId: a.id, amount: 250000, label: 'Kojakoja' })
    expect(
      service.listEntries({ ...cell, itemId: a.id }).map((e) => [e.label, e.createdAt])
    ).toEqual([
      ['Kojakoja', T9],
      ['Fanatsarana', T10]
    ])
    expect(item(a.id)?.amounts?.actual).toEqual({ total: 350000, entryCount: 2, detailed: true })
  })

  it('modifie et supprime une saisie', () => {
    const { church, service, clock } = setup()
    const { a } = church()
    const { id } = service.addEntry({ ...cell, itemId: a.id, amount: 1, label: 'X' })
    clock.set(new Date(T10))
    service.updateEntry({ id, amount: 2, label: null })
    expect(service.listEntries({ ...cell, itemId: a.id })).toEqual([
      { id, amount: 2, label: null, createdAt: T9, updatedAt: T10 }
    ])
    service.deleteEntry(id)
    expect(service.listEntries({ ...cell, itemId: a.id })).toEqual([])
    expectAppError(() => service.deleteEntry(id), 'NOT_FOUND')
  })

  it('refuse une somme supérieure au maximum', () => {
    const { church, service } = setup()
    const { a } = church()
    service.addEntry({ ...cell, itemId: a.id, amount: MAX_AMOUNT, label: 'A' })
    expectAppError(
      () => service.addEntry({ ...cell, itemId: a.id, amount: 1, label: 'B' }),
      'BUSINESS_RULE'
    )
    const { id } = service.addEntry({ ...cell, itemId: a.id, amount: 0, label: 'B' })
    expectAppError(() => service.updateEntry({ id, amount: 1, label: 'B' }), 'BUSINESS_RULE')
  })

  it('l’estimation N+1 de 2026 est l’estimation de 2027', () => {
    const { church, service, item } = setup()
    const { i1 } = church()
    service.setTotal({ itemId: i1.id, year: 2027, type: 'estimate', amount: 600000 })
    expect(item(i1.id, 2026)?.amounts?.nextEstimate.total).toBe(600000)
    expect(item(i1.id, 2027)?.amounts?.estimate.total).toBe(600000)
    expect(item(i1.id, 2026)?.amounts?.estimate.total).toBeNull()
  })

  it('n’affiche plus les saisies d’un élément supprimé', () => {
    const { church, service } = setup()
    const { i, i1 } = church()
    service.setTotal({ ...cell, itemId: i1.id, amount: 5 })
    service.deleteItem(i.id)
    expectAppError(() => service.listEntries({ ...cell, itemId: i1.id }), 'NOT_FOUND')
  })
})
