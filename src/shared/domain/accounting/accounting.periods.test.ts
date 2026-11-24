import { describe, expect, it } from 'vitest'
import {
  defaultOperationDate,
  localDateOf,
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
