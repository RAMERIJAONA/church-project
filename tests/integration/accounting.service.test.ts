import { describe, expect, it } from 'vitest'
import { MAX_AMOUNT } from '@shared/utils/money'
import { makeChildInput, makeRootInput } from '@tests/factories/accounting.factory'
import {
  cell,
  D,
  expectAppError,
  setupAccounting as setup,
  T10,
  T9,
  YEAR
} from '@tests/helpers/accounting-context'

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

  it('refuse un montant sur un groupe', () => {
    const { church, service } = setup()
    const c = church()
    for (const id of [c.f1.id, c.i.id]) {
      expectAppError(() => service.setTotal({ ...cell, itemId: id, amount: 1 }), 'BUSINESS_RULE')
      expectAppError(
        () => service.addEntry({ ...cell, itemId: id, amount: 1, label: null, operatedOn: D }),
        'BUSINESS_RULE'
      )
    }
  })

  it('accepte un montant sur une rubrique principale sans sous-rubrique', () => {
    const { service, item } = setup()
    const root = service.createItem(makeRootInput({ prefix: 'A', description: 'fanomezana' }))
    service.setTotal({ ...cell, itemId: root.id, amount: 5000 })
    expect(item(root.id)?.amounts?.actual.total).toBe(5000)
    expect(item(root.id)?.canAddChild).toBe(false)
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
      {
        id: expect.any(Number),
        amount: 600000,
        label: null,
        operatedOn: D,
        createdAt: T9,
        updatedAt: T10
      }
    ])
    expect(item(i1.id)?.amounts?.actual).toEqual({ total: 600000, entryCount: 1, detailed: false })

    service.setTotal({ ...cell, itemId: i1.id, amount: null })
    expect(service.listEntries({ ...cell, itemId: i1.id })).toEqual([])
    expect(item(i1.id)?.amounts?.actual.total).toBeNull()
  })

  it('refuse un total direct sur une case détaillée', () => {
    const { church, service } = setup()
    const { i1 } = church()
    service.addEntry({ ...cell, itemId: i1.id, amount: 1000, label: 'Kojakoja', operatedOn: D })
    expectAppError(() => service.setTotal({ ...cell, itemId: i1.id, amount: 5 }), 'BUSINESS_RULE')
    expect(service.listEntries({ ...cell, itemId: i1.id }).map((e) => e.amount)).toEqual([1000])
  })

  it('additionne les saisies détaillées et les liste par date de création', () => {
    const { church, service, clock, item } = setup()
    const { a } = church()
    clock.set(new Date(T10))
    service.addEntry({ ...cell, itemId: a.id, amount: 100000, label: 'Fanatsarana', operatedOn: D })
    clock.set(new Date(T9))
    service.addEntry({ ...cell, itemId: a.id, amount: 250000, label: 'Kojakoja', operatedOn: D })
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
    const { id } = service.addEntry({ ...cell, itemId: a.id, amount: 1, label: 'X', operatedOn: D })
    clock.set(new Date(T10))
    service.updateEntry({ id, amount: 2, label: null, operatedOn: D })
    expect(service.listEntries({ ...cell, itemId: a.id })).toEqual([
      { id, amount: 2, label: null, operatedOn: D, createdAt: T9, updatedAt: T10 }
    ])
    service.deleteEntry(id)
    expect(service.listEntries({ ...cell, itemId: a.id })).toEqual([])
    expectAppError(() => service.deleteEntry(id), 'NOT_FOUND')
  })

  it('refuse une somme supérieure au maximum', () => {
    const { church, service } = setup()
    const { a } = church()
    service.addEntry({ ...cell, itemId: a.id, amount: MAX_AMOUNT, label: 'A', operatedOn: D })
    expectAppError(
      () => service.addEntry({ ...cell, itemId: a.id, amount: 1, label: 'B', operatedOn: D }),
      'BUSINESS_RULE'
    )
    const { id } = service.addEntry({ ...cell, itemId: a.id, amount: 0, label: 'B', operatedOn: D })
    expectAppError(
      () => service.updateEntry({ id, amount: 1, label: 'B', operatedOn: D }),
      'BUSINESS_RULE'
    )
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
