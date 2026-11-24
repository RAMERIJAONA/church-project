import { describe, expect, it } from 'vitest'
import { capitalize, formatDateTime, formatLongDate } from './dates'

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
