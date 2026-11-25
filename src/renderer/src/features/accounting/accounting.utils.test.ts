import { describe, expect, it } from 'vitest'
import { formatShortDateTime } from '@shared/utils/dates'
import { makeItemDTO, makeRootDTO } from '@tests/factories/accounting.factory'
import {
  entryDateLabel,
  summaryPeriods,
  sumPeriodTotals,
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

  it('aplatit l’arbre en profondeur d’abord', () => {
    expect(flattenTree([f1]).map((r) => r.item.code)).toEqual([
      'F1',
      'F1-I',
      'F1-I-1',
      'F1-II',
      'F1-II-1',
      'F1-II-1 A)',
      'F1-II-1 B)'
    ])
  })

  it('remplace le total d’une case sans toucher au reste (mise à jour optimiste)', () => {
    const sheet = { year: 2026, items: [f1] }
    const next = withTotal(sheet, 6, 'nextEstimate', 600000)
    const updated = next.items[0]?.children[1]?.children[0]?.children[0]
    expect(updated?.amounts?.nextEstimate).toEqual({
      total: 600000,
      entryCount: 1,
      detailed: false,
      lastEntryAt: expect.any(String) // heure locale, remplacée au rechargement
    })
    expect(updated?.amounts?.actual.total).toBeNull()
    expect(
      withTotal(sheet, 6, 'actual', null).items[0]?.children[1]?.children[0]?.children[0]?.amounts
        ?.actual
    ).toEqual({
      total: null,
      entryCount: 0,
      detailed: false,
      lastEntryAt: null
    })
    expect(
      sheet.items[0]?.children[1]?.children[0]?.children[0]?.amounts?.nextEstimate.total
    ).toBeNull()
  })
})

describe('synthèse des réalisations', () => {
  it('donne le jour, la semaine (lundi-dimanche), le mois et l’année en cours', () => {
    expect(summaryPeriods('2026-11-25').map((p) => [p.title, p.range.from, p.range.to])).toEqual([
      ['Aujourd’hui', '2026-11-25', '2026-11-25'],
      ['Cette semaine', '2026-11-23', '2026-11-29'],
      ['Ce mois', '2026-11-01', '2026-11-30'],
      ['Cette année', '2026-01-01', '2026-12-31']
    ])
  })

  it('additionne les réalisations de toutes les rubriques, vide si aucune', () => {
    expect(
      sumPeriodTotals([
        { itemId: 1, total: 420000, entryCount: 1 },
        { itemId: 2, total: 350000, entryCount: 2 }
      ])
    ).toBe(770000)
    expect(sumPeriodTotals([])).toBeNull()
  })
})

describe('date sous un montant', () => {
  it('date et heure de la saisie, ou l’année seule si saisie après la fin de l’année', () => {
    const at = '2026-11-25T11:32:00.000Z'
    expect(entryDateLabel(at, 2026)).toBe(formatShortDateTime(new Date(at)))
    expect(entryDateLabel(at, 2027)).toBe(formatShortDateTime(new Date(at)))
    expect(entryDateLabel(at, 2025)).toBe('2025')
  })
})
