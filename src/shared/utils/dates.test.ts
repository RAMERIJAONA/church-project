import { describe, expect, it } from 'vitest'
import { capitalize, formatDateTime, formatLongDate, isCalendarDate, localDateOf } from './dates'

describe('dates fr-FR', () => {
  it('formate une date longue en français', () => {
    expect(formatLongDate(new Date(2026, 10, 24))).toBe('mardi 24 novembre 2026')
  })

  it('formate date et heure', () => {
    expect(formatDateTime(new Date(2026, 10, 24, 14, 5))).toBe('24 novembre 2026 à 14:05')
  })

  it('met une majuscule initiale', () => {
    expect(capitalize('mardi 24 novembre')).toBe('Mardi 24 novembre')
    expect(capitalize('')).toBe('')
  })
})

describe('localDateOf', () => {
  it("donne la date du calendrier local d'un instant", () => {
    expect(localDateOf(new Date(2026, 10, 24, 12))).toBe('2026-11-24')
  })
})

describe('isCalendarDate', () => {
  it('reconnaît une date existante et refuse les autres', () => {
    expect(isCalendarDate('2024-02-29')).toBe(true)
    expect(isCalendarDate('2026-02-29')).toBe(false)
    expect(isCalendarDate('12/03/1985')).toBe(false)
  })
})
