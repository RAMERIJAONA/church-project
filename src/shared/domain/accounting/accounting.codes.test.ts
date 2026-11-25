import { describe, expect, it } from 'vitest'
import golden from './__golden__/codes.json'
import {
  availableLetters,
  childCode,
  comparePrefixes,
  letterAt,
  letterIndex,
  nextLetter,
  rootCode,
  toRoman
} from './accounting.codes'
import { MALAGASY_LETTERS } from './accounting.types'

describe('lettres automatiques (alphabet malgache)', () => {
  it('suit l’alphabet malgache sans C, Q, U, W, X', () => {
    expect(MALAGASY_LETTERS).toHaveLength(21)
    expect(Array.from({ length: 21 }, (_, i) => letterAt(i)).join('')).toBe('ABDEFGHIJKLMNOPRSTVYZ')
  })

  it('continue après Z avec deux lettres, comme un tableur', () => {
    expect([20, 21, 22, 23, 41, 42].map(letterAt)).toEqual(['Z', 'AA', 'AB', 'AD', 'AZ', 'BA'])
    for (let i = 0; i < 500; i++) expect(letterIndex(letterAt(i))).toBe(i)
    expect(letterIndex('C')).toBe(-1)
    expect(letterIndex('')).toBe(-1)
  })

  it('attribue la lettre suivant la plus haute déjà utilisée', () => {
    expect(nextLetter([])).toBe('A')
    expect(nextLetter(['A'])).toBe('B')
    expect(nextLetter(['A', 'B'])).toBe('D')
    expect(nextLetter(['B', 'A', 'B'])).toBe('D')
    expect(nextLetter(['Z'])).toBe('AA')
  })

  it('propose les lettres utilisées puis la suivante, sans doublon', () => {
    expect(availableLetters([])).toEqual(['A'])
    expect(availableLetters(['B', 'A', 'A'])).toEqual(['A', 'B', 'D'])
  })

  it('trie les lettres comme un tableur', () => {
    expect(['AA', 'B', 'A', 'Z'].sort(comparePrefixes)).toEqual(['A', 'B', 'Z', 'AA'])
    expect(comparePrefixes('A', 'A')).toBe(0)
  })
})

describe('chiffres romains (niveau 2)', () => {
  it('convertit en chiffres romains', () => {
    expect([1, 4, 9, 14, 40, 2026].map(toRoman)).toEqual(['I', 'IV', 'IX', 'XIV', 'XL', 'MMXXVI'])
  })

  it('refuse 0 et les nombres au-delà de 3999', () => {
    expect(() => toRoman(0)).toThrow(RangeError)
    expect(() => toRoman(4000)).toThrow(RangeError)
  })
})

describe('numéros par niveau', () => {
  it('numérote le niveau 4 en alphabet malgache', () => {
    expect(childCode('F1-II-1', 4, 1, 'leaf')).toBe('F1-II-1 A)')
    expect(childCode('F1-II-1', 4, 3, 'leaf')).toBe('F1-II-1 D)')
    expect(childCode('F1-II-1', 4, 22, 'leaf')).toBe('F1-II-1 AA)')
  })

  it('niveau 2 : chiffres romains pour un groupe, chiffres arabes pour une rubrique à montant', () => {
    expect(childCode('F1', 2, 2, 'group')).toBe('F1-II')
    expect(childCode('A1', 2, 2, 'leaf')).toBe('A1-2')
    // Aux niveaux 3 et 4, la nature ne change rien
    expect(childCode('F1-II', 3, 4, 'group')).toBe('F1-II-4')
    expect(childCode('F1-II', 3, 4, 'leaf')).toBe('F1-II-4')
  })

  it('niveau 1 : sorties à partir de 1, entrées à partir de 2 (2026-11-25)', () => {
    expect(rootCode('A', 1)).toBe('A1')
    expect(rootCode('A', 1, 'expense')).toBe('A1')
    expect(rootCode('A', 2, 'expense')).toBe('A2')
    expect(rootCode('A', 1, 'income')).toBe('A2')
    expect(rootCode('A', 2, 'income')).toBe('A3')
    expect(rootCode('AB', 1, 'income')).toBe('AB2')
    // Les sous-rubriques suivent le numéro du parent, comme dans les sorties
    expect(childCode(rootCode('A', 1, 'income'), 2, 1, 'leaf')).toBe('A2-1')
    expect(childCode('A2', 2, 1, 'group')).toBe('A2-I')
    expect(childCode('A2-I', 3, 1, 'leaf')).toBe('A2-I-1')
  })

  it('reproduit le plan de l’église (golden)', () => {
    for (const g of golden) {
      const code =
        g.parent === null
          ? rootCode(g.prefix ?? '', g.rank)
          : childCode(g.parent, g.level as 2 | 3 | 4, g.rank, g.kind as 'group' | 'leaf')
      expect(code, JSON.stringify(g)).toBe(g.code)
    }
  })
})
