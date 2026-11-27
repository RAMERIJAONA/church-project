import { describe, expect, it } from 'vitest'
import golden from './__golden__/codes.json'
import {
  childCode,
  comparePrefixes,
  letterAt,
  letterIndex,
  level2Numeral,
  type Level2Numeral,
  nextLetter,
  reletterRoots,
  rootCode
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

  // Règle du porteur (2026-11-25) : une lettre par rubrique principale, lettres sans trou
  it('après une suppression, décale les lettres suivantes pour combler le trou', () => {
    const roots = [
      { id: 4, prefix: 'E', position: 1 },
      { id: 1, prefix: 'A', position: 1 },
      { id: 3, prefix: 'D', position: 1 }
    ]
    expect(reletterRoots(roots)).toEqual([
      { id: 3, prefix: 'B' },
      { id: 4, prefix: 'D' }
    ])
    expect(reletterRoots([{ id: 1, prefix: 'A', position: 1 }])).toEqual([])
    expect(reletterRoots([])).toEqual([])
  })

  it('sépare des lettres en double (anciennes données D1, D2) dans l’ordre des positions', () => {
    const roots = [
      { id: 1, prefix: 'A', position: 1 },
      { id: 7, prefix: 'D', position: 2 },
      { id: 5, prefix: 'D', position: 1 },
      { id: 9, prefix: 'AA', position: 1 },
      { id: 8, prefix: 'Z', position: 1 }
    ]
    expect(reletterRoots(roots)).toEqual([
      { id: 5, prefix: 'B' }, // l'ancien D1 ; l'ancien D2 (id 7) garde D
      { id: 8, prefix: 'E' },
      { id: 9, prefix: 'F' }
    ])
  })

  it('trie les lettres comme un tableur', () => {
    expect(['AA', 'B', 'A', 'Z'].sort(comparePrefixes)).toEqual(['A', 'B', 'Z', 'AA'])
    expect(comparePrefixes('A', 'A')).toBe(0)
  })
})

describe('numéros par niveau', () => {
  it('numérote le niveau 4 en alphabet malgache', () => {
    expect(childCode('F1-II-1', 4, 1)).toBe('F1-II-1 A)')
    expect(childCode('F1-II-1', 4, 3)).toBe('F1-II-1 D)')
    expect(childCode('F1-II-1', 4, 22)).toBe('F1-II-1 AA)')
  })

  it('niveau 2 : chiffres romains si une sœur est un groupe, chiffres arabes sinon', () => {
    expect(level2Numeral(true)).toBe('roman')
    expect(level2Numeral(false)).toBe('arabic')
    expect(childCode('F1', 2, 2, 'roman')).toBe('F1-II')
    expect(childCode('A1', 2, 2, 'arabic')).toBe('A1-2')
    // Aux niveaux 3 et 4, le style ne change rien
    expect(childCode('F1-II', 3, 4, 'roman')).toBe('F1-II-4')
    expect(childCode('F1-II', 3, 4, 'arabic')).toBe('F1-II-4')
  })

  it('niveau 1 : toujours 1 pour les sorties, toujours 2 pour les entrées (2026-11-25)', () => {
    expect(rootCode('A')).toBe('A1')
    expect(rootCode('D', 'expense')).toBe('D1')
    expect(rootCode('A', 'income')).toBe('A2')
    expect(rootCode('D', 'income')).toBe('D2')
    expect(rootCode('AB', 'income')).toBe('AB2')
    // Les sous-rubriques suivent le numéro du parent, comme dans les sorties
    expect(childCode(rootCode('A', 'income'), 2, 1, 'arabic')).toBe('A2-1')
    expect(childCode('A2', 2, 1, 'roman')).toBe('A2-I')
    expect(childCode('A2-I', 3, 1)).toBe('A2-I-1')
  })

  it('reproduit le plan de l’église (golden)', () => {
    for (const g of golden) {
      const code =
        g.parent === null
          ? rootCode(g.prefix ?? '')
          : childCode(g.parent, g.level as 2 | 3 | 4, g.rank, g.numeral as Level2Numeral)
      expect(code, JSON.stringify(g)).toBe(g.code)
    }
  })
})
