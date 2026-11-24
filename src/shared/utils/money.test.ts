import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatAmountTyping,
  MAX_AMOUNT,
  parseAmount,
  THOUSANDS_SEPARATOR
} from './money'

/** Rend le séparateur visible dans les attentes : « 2 000 000 » s'écrit '2_000_000'. */
const show = (text: string): string => text.split(THOUSANDS_SEPARATOR).join('_')

describe('formatAmount', () => {
  it('groupe les milliers avec une espace insécable de largeur normale', () => {
    expect(THOUSANDS_SEPARATOR).toBe(String.fromCharCode(0xa0))
    expect(show(formatAmount(2000000))).toBe('2_000_000')
    expect(show(formatAmount(7654321))).toBe('7_654_321')
    expect(show(formatAmount(999))).toBe('999')
    expect(formatAmount(0)).toBe('0')
  })

  it('se relit avec parseAmount', () => {
    for (const n of [0, 7, 1000, 2000000, MAX_AMOUNT]) {
      expect(parseAmount(formatAmount(n))).toEqual({ ok: true, value: n })
    }
  })
})

describe('formatAmountTyping', () => {
  it.each([
    ['2000000', '2_000_000'],
    ['20000', '20_000'],
    ['2 000 0001', '20_000_001'],
    ['7,654,321', '7_654_321'],
    ['abc12x3', '123'],
    ['000000', '000_000'],
    ['0', '0'],
    ['', '']
  ])('« %s » → %s', (typed, expected) => {
    expect(show(formatAmountTyping(typed))).toBe(expected)
  })

  it('limite à 12 chiffres', () => {
    expect(show(formatAmountTyping('12345678901234'))).toBe('123_456_789_012')
  })
})

describe('parseAmount', () => {
  it.each([
    ['7654321', 7654321],
    ['7 654 321', 7654321],
    ['7,654,321', 7654321],
    ['7.654.321', 7654321],
    ['7\u202f654\u202f321', 7654321],
    ['  12 000  ', 12000],
    ['0', 0]
  ])('lit « %s »', (text, expected) => {
    expect(parseAmount(text)).toEqual({ ok: true, value: expected })
  })

  it('renvoie null pour une saisie vide', () => {
    expect(parseAmount('')).toEqual({ ok: true, value: null })
    expect(parseAmount('   ')).toEqual({ ok: true, value: null })
  })

  it.each(['1,5', '12,50', '-100', 'abc', '1 2', '12 0000', '1e6'])('refuse « %s »', (text) => {
    expect(parseAmount(text)).toEqual({ ok: false })
  })

  it('refuse un montant au-delà du plafond', () => {
    expect(parseAmount(String(MAX_AMOUNT))).toEqual({ ok: true, value: MAX_AMOUNT })
    expect(parseAmount(String(MAX_AMOUNT + 1))).toEqual({ ok: false })
  })
})
