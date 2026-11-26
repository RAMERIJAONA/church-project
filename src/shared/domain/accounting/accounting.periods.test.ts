import { describe, expect, it } from 'vitest'
import {
  defaultOperationDate,
  localDateOf,
  localInstantRange,
  monthGrid,
  periodLabel,
  periodRange,
  rangeLabel,
  shiftPeriod
} from './accounting.periods'
import { operationDateSchema } from './accounting.types'

describe('date d’opération par défaut', () => {
  it('prend la date locale du jour', () => {
    expect(localDateOf(new Date(2026, 10, 24, 12))).toBe('2026-11-24')
    expect(localDateOf(new Date(2026, 0, 5, 12))).toBe('2026-01-05')
  })

  it('ramène aujourd’hui dans l’année de la case', () => {
    const today = new Date(2026, 10, 24, 12)
    expect(defaultOperationDate(today, 2026)).toBe('2026-11-24')
    expect(defaultOperationDate(today, 2025)).toBe('2025-12-31')
    expect(defaultOperationDate(today, 2027)).toBe('2027-01-01')
  })

  it('n’accepte qu’une vraie date du calendrier', () => {
    expect(operationDateSchema.safeParse('2026-02-28').success).toBe(true)
    expect(operationDateSchema.safeParse('2024-02-29').success).toBe(true)
    for (const bad of ['2026-02-29', '2026-13-01', '2026-1-5', '24/11/2026', '']) {
      expect(operationDateSchema.safeParse(bad).success, bad).toBe(false)
    }
  })
})

describe('périodes', () => {
  it('donne le jour, la semaine (lundi au dimanche) et le mois d’une date', () => {
    expect(periodRange('day', '2026-11-24')).toEqual({ from: '2026-11-24', to: '2026-11-24' })
    expect(periodRange('week', '2026-11-24')).toEqual({ from: '2026-11-23', to: '2026-11-29' })
    expect(periodRange('week', '2026-11-29')).toEqual({ from: '2026-11-23', to: '2026-11-29' })
    expect(periodRange('week', '2026-11-23')).toEqual({ from: '2026-11-23', to: '2026-11-29' })
    expect(periodRange('month', '2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(periodRange('month', '2024-02-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
  })

  it('une semaine peut chevaucher deux années', () => {
    expect(periodRange('week', '2027-01-01')).toEqual({ from: '2026-12-28', to: '2027-01-03' })
  })

  it('passe à la période précédente ou suivante', () => {
    expect(shiftPeriod('day', '2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftPeriod('week', '2026-11-24', -1)).toBe('2026-11-17')
    expect(shiftPeriod('month', '2026-01-31', 1)).toBe('2026-02-01')
    expect(shiftPeriod('month', '2026-01-15', -1)).toBe('2025-12-01')
  })

  it('nomme la période en français', () => {
    expect(periodLabel('day', periodRange('day', '2026-11-24'))).toBe('Mardi 24 novembre 2026')
    expect(periodLabel('week', periodRange('week', '2026-11-24'))).toBe(
      'Semaine du 23 au 29 novembre 2026'
    )
    expect(periodLabel('week', periodRange('week', '2026-12-01'))).toBe(
      'Semaine du 30 novembre au 6 décembre 2026'
    )
    expect(periodLabel('week', periodRange('week', '2027-01-01'))).toBe(
      'Semaine du 28 décembre 2026 au 3 janvier 2027'
    )
    expect(periodLabel('month', periodRange('month', '2026-11-24'))).toBe('Novembre 2026')
  })
})

describe('période personnalisée', () => {
  it('nomme une période quelconque', () => {
    expect(rangeLabel({ from: '2026-11-03', to: '2026-11-24' })).toBe('Du 3 au 24 novembre 2026')
    expect(rangeLabel({ from: '2026-01-01', to: '2026-11-24' })).toBe(
      'Du 1 janvier au 24 novembre 2026'
    )
    expect(rangeLabel({ from: '2025-09-01', to: '2026-08-31' })).toBe(
      'Du 1 septembre 2025 au 31 août 2026'
    )
    expect(rangeLabel({ from: '2026-11-24', to: '2026-11-24' })).toBe('Mardi 24 novembre 2026')
  })
})

describe('calendrier', () => {
  it('donne les semaines du mois, du lundi au dimanche, avec les jours voisins', () => {
    const grid = monthGrid('2026-11-24')
    expect(grid[0]).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01'
    ])
    expect(grid.at(-1)?.at(-1)).toBe('2026-12-06')
    expect(grid).toHaveLength(6)
    expect(grid.every((week) => week.length === 7)).toBe(true)
  })

  it('commence au lundi même quand le mois commence un lundi', () => {
    expect(monthGrid('2027-02-10')[0]?.[0]).toBe('2027-02-01')
  })
})

// Synthèse (règle du porteur, 2026-11-26) : les saisies comptent par date de saisie locale.
// L'ancien calcul au prorata des jours (`prorateEstimate`) est remplacé, ses tests avec lui.
describe('bornes en instants UTC de jours locaux', () => {
  const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

  it('va de minuit du premier jour local à minuit du lendemain du dernier', () => {
    const range = periodRange('week', '2026-11-25')
    const { from, to } = localInstantRange(range)
    expect(from).toMatch(ISO)
    expect(to).toMatch(ISO)
    expect(localDateOf(new Date(from))).toBe('2026-11-23')
    expect(localDateOf(new Date(Date.parse(from) - 1))).toBe('2026-11-22')
    expect(localDateOf(new Date(Date.parse(to) - 1))).toBe('2026-11-29')
    expect(localDateOf(new Date(to))).toBe('2026-11-30')
  })

  it('couvre un jour entier, y compris en fin d’année', () => {
    const { from, to } = localInstantRange({ from: '2026-12-31', to: '2026-12-31' })
    expect(localDateOf(new Date(from))).toBe('2026-12-31')
    expect(localDateOf(new Date(to))).toBe('2027-01-01')
    expect(Date.parse(to) - Date.parse(from)).toBe(86_400_000)
  })
})
