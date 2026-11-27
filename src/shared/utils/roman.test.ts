import { describe, expect, it } from 'vitest'
import { toRoman } from './roman'

describe('chiffres romains', () => {
  it('convertit en chiffres romains', () => {
    expect([1, 4, 9, 14, 40, 2026].map(toRoman)).toEqual(['I', 'IV', 'IX', 'XIV', 'XL', 'MMXXVI'])
  })

  it('refuse 0 et les nombres au-delà de 3999', () => {
    expect(() => toRoman(0)).toThrow(RangeError)
    expect(() => toRoman(4000)).toThrow(RangeError)
  })
})
