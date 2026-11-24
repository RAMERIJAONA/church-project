import { describe, expect, it } from 'vitest'
import { makeItemDTO, makeRootDTO } from '@tests/factories/accounting.factory'
import {
  AMOUNT_COLUMNS,
  columnLabel,
  columnTarget,
  flattenTree,
  withTotal
} from './accounting.utils'

describe('colonnes de montant', () => {
  it('cible l’estimation de l’année suivante pour la 3e colonne', () => {
    expect(AMOUNT_COLUMNS).toEqual(['estimate', 'actual', 'nextEstimate'])
    expect(columnTarget(2026, 'estimate')).toEqual({ year: 2026, type: 'estimate' })
    expect(columnTarget(2026, 'actual')).toEqual({ year: 2026, type: 'actual' })
    expect(columnTarget(2026, 'nextEstimate')).toEqual({ year: 2027, type: 'estimate' })
  })

  it('nomme les colonnes avec leur année', () => {
    expect(AMOUNT_COLUMNS.map((c) => columnLabel(2026, c))).toEqual([
      'Estimation 2026',
      'Réalisation 2026',
      'Estimation 2027'
    ])
  })
})

describe('flattenTree', () => {
  const b = makeItemDTO({ id: 7, code: 'F1-II-1 B)', level: 4 })
  const a = makeItemDTO({ id: 6, code: 'F1-II-1 A)', level: 4 })
  const ii1 = makeItemDTO({ id: 5, code: 'F1-II-1', level: 3, amounts: null, children: [a, b] })
  const ii = makeItemDTO({ id: 4, code: 'F1-II', amounts: null, children: [ii1] })
  const i1 = makeItemDTO({ id: 3, code: 'F1-I-1', level: 3 })
  const i = makeItemDTO({ id: 2, code: 'F1-I', amounts: null, children: [i1] })
  const f1 = makeRootDTO({ code: 'F1', children: [i, ii] })

  it('aplatit l’arbre en profondeur d’abord, avec la position parmi les frères', () => {
    expect(flattenTree([f1]).map((r) => [r.item.code, r.isFirst, r.isLast])).toEqual([
      ['F1', true, true],
      ['F1-I', true, false],
      ['F1-I-1', true, true],
      ['F1-II', false, true],
      ['F1-II-1', true, true],
      ['F1-II-1 A)', true, false],
      ['F1-II-1 B)', false, true]
    ])
  })

  it('au niveau 1, les frères sont ceux de la même lettre', () => {
    const rows = flattenTree([
      makeRootDTO({ id: 1, code: 'A1', prefix: 'A' }),
      makeRootDTO({ id: 2, code: 'A2', prefix: 'A' }),
      makeRootDTO({ id: 3, code: 'B1', prefix: 'B' })
    ])
    expect(rows.map((r) => [r.item.code, r.isFirst, r.isLast])).toEqual([
      ['A1', true, false],
      ['A2', false, true],
      ['B1', true, true]
    ])
  })

  it('remplace le total d’une case sans toucher au reste (mise à jour optimiste)', () => {
    const sheet = { year: 2026, items: [f1] }
    const next = withTotal(sheet, 6, 'nextEstimate', 600000)
    const updated = next.items[0]?.children[1]?.children[0]?.children[0]
    expect(updated?.amounts?.nextEstimate).toEqual({
      total: 600000,
      entryCount: 1,
      detailed: false
    })
    expect(updated?.amounts?.actual.total).toBeNull()
    expect(
      withTotal(sheet, 6, 'actual', null).items[0]?.children[1]?.children[0]?.children[0]?.amounts
        ?.actual
    ).toEqual({
      total: null,
      entryCount: 0,
      detailed: false
    })
    expect(
      sheet.items[0]?.children[1]?.children[0]?.children[0]?.amounts?.nextEstimate.total
    ).toBeNull()
  })
})
