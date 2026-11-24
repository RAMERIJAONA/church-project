import { describe, expect, it } from 'vitest'
import { makeCellDTO, makeItemDTO, makeRootDTO } from '@tests/factories/accounting.factory'
import type { AccountingItemDTO } from './accounting.types'
import { rollUp } from './accounting.totals'

const leaf = (id: number, actual: number | null): AccountingItemDTO =>
  makeItemDTO({
    id,
    code: `L${id}`,
    amounts: {
      estimate: makeCellDTO(),
      actual: makeCellDTO({ total: actual, entryCount: actual === null ? 0 : 1 }),
      nextEstimate: makeCellDTO()
    }
  })

/** A1 > {A1-I > {3: 100, 4: vide}, A1-II > {5: 250}} ; B1 feuille 1000 ; D1 groupe vide > 7 vide */
const tree: AccountingItemDTO[] = [
  makeRootDTO({
    id: 1,
    children: [
      makeItemDTO({ id: 2, amounts: null, children: [leaf(3, 100), leaf(4, null)] }),
      makeItemDTO({ id: 6, amounts: null, children: [leaf(5, 250)] })
    ]
  }),
  { ...leaf(8, 1000), level: 1, prefix: 'B' },
  makeRootDTO({ id: 9, prefix: 'D', children: [leaf(7, null)] })
]

const actualOf = (item: AccountingItemDTO): number | null => item.amounts?.actual.total ?? null

describe('rollUp : sous-totaux et total général', () => {
  it('additionne toute la descendance de chaque groupe', () => {
    const { byItem } = rollUp(tree, actualOf)
    expect(byItem.get(2)).toBe(100)
    expect(byItem.get(6)).toBe(250)
    expect(byItem.get(1)).toBe(350)
  })

  it('garde la valeur des rubriques qui portent des montants', () => {
    const { byItem } = rollUp(tree, actualOf)
    expect(byItem.get(3)).toBe(100)
    expect(byItem.get(8)).toBe(1000)
    expect(byItem.get(4)).toBeNull()
  })

  it('laisse vide un groupe dont aucune rubrique n’a de montant', () => {
    expect(rollUp(tree, actualOf).byItem.get(9)).toBeNull()
  })

  it('donne le total général de toutes les rubriques principales', () => {
    expect(rollUp(tree, actualOf).grand).toBe(1350)
    expect(rollUp([], actualOf).grand).toBeNull()
  })

  it('compte un montant nul comme un montant', () => {
    const { byItem, grand } = rollUp([makeRootDTO({ id: 1, children: [leaf(3, 0)] })], actualOf)
    expect(byItem.get(1)).toBe(0)
    expect(grand).toBe(0)
  })
})
