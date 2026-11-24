import { describe, expect, it } from 'vitest'
import {
  availableLetters,
  buildSheet,
  comparePrefixes,
  letterAt,
  letterIndex,
  nextLetter,
  nextLineCode,
  nextSectionCode,
  normalizePrefix,
  type LineRow,
  type SectionRow
} from './accounting.rules'
import {
  createSectionInputSchema,
  MALAGASY_LETTERS,
  setAmountInputSchema,
  updateSectionInputSchema
} from './accounting.types'

const section = (o: Partial<SectionRow> & Pick<SectionRow, 'id'>): SectionRow => ({
  prefix: 'A',
  position: o.id,
  description: `Rubrique ${o.id}`,
  ...o
})
const line = (o: Partial<LineRow> & Pick<LineRow, 'id' | 'sectionId'>): LineRow => ({
  position: o.id,
  description: `Ligne ${o.id}`,
  ...o
})

describe('buildSheet : numérotation automatique', () => {
  it('numérote les rubriques par lettre et les lignes dans leur rubrique', () => {
    const sheet = buildSheet(
      2026,
      [section({ id: 1, description: 'ASA IOMBONANA' }), section({ id: 2 })],
      [
        line({ id: 10, sectionId: 1, description: 'Kitapo iombonana' }),
        line({ id: 11, sectionId: 1, description: 'KTM - Adidy' }),
        line({ id: 12, sectionId: 2 })
      ],
      [{ lineId: 10, amount: 7654321 }]
    )
    expect(sheet.year).toBe(2026)
    expect(sheet.sections.map((s) => s.code)).toEqual(['A1', 'A2'])
    expect(sheet.sections[0]?.lines).toEqual([
      { id: 10, code: 'A1-1', description: 'Kitapo iombonana', amount: 7654321 },
      { id: 11, code: 'A1-2', description: 'KTM - Adidy', amount: null }
    ])
    expect(sheet.sections[1]?.lines.map((l) => l.code)).toEqual(['A2-1'])
  })

  it('recommence à 1 pour chaque lettre et trie les lettres (A… Z, AA…)', () => {
    const sheet = buildSheet(
      2026,
      [
        section({ id: 1, prefix: 'B' }),
        section({ id: 2, prefix: 'AA' }),
        section({ id: 3, prefix: 'A' }),
        section({ id: 4, prefix: 'B' })
      ],
      [],
      []
    )
    expect(sheet.sections.map((s) => s.code)).toEqual(['A1', 'B1', 'B2', 'AA1'])
  })

  it('suit la position, pas l’ordre de création, et ne laisse pas de trou', () => {
    const sheet = buildSheet(
      2026,
      [section({ id: 1 })],
      [
        line({ id: 3, sectionId: 1, position: 1 }),
        line({ id: 1, sectionId: 1, position: 5 }),
        line({ id: 2, sectionId: 1, position: 9 })
      ],
      []
    )
    expect(sheet.sections[0]?.lines.map((l) => [l.id, l.code])).toEqual([
      [3, 'A1-1'],
      [1, 'A1-2'],
      [2, 'A1-3']
    ])
  })

  it('ignore les lignes dont la rubrique est absente', () => {
    const sheet = buildSheet(2026, [section({ id: 1 })], [line({ id: 5, sectionId: 99 })], [])
    expect(sheet.sections[0]?.lines).toEqual([])
  })
})

describe('aperçu du prochain numéro', () => {
  const sheet = buildSheet(
    2026,
    [section({ id: 1 }), section({ id: 2, prefix: 'B' })],
    [line({ id: 1, sectionId: 1 }), line({ id: 2, sectionId: 1 })],
    []
  )

  it('propose la rubrique suivante de la lettre saisie, en majuscules', () => {
    expect(nextSectionCode('a', sheet.sections)).toBe('A2')
    expect(nextSectionCode('C', sheet.sections)).toBe('C1')
  })

  it('propose la ligne suivante de la rubrique', () => {
    expect(nextLineCode(sheet.sections[0]!)).toBe('A1-3')
    expect(nextLineCode(sheet.sections[1]!)).toBe('B1-1')
  })
})

describe('saisie', () => {
  it('normalise la lettre', () => {
    expect(normalizePrefix(' b ')).toBe('B')
    expect(createSectionInputSchema.parse({ prefix: 'a', description: ' X ' })).toEqual({
      prefix: 'A',
      description: 'X'
    })
  })

  it('refuse une lettre invalide ou une description vide', () => {
    for (const prefix of ['', '1', 'A1', 'ABCD', 'É', 'C', 'Q', 'U', 'W', 'X', 'AC']) {
      expect(createSectionInputSchema.safeParse({ prefix, description: 'X' }).success).toBe(false)
    }
    expect(createSectionInputSchema.safeParse({ prefix: 'A', description: '  ' }).success).toBe(
      false
    )
  })

  it('refuse un montant négatif ou décimal', () => {
    const base = { lineId: 1, year: 2026 }
    expect(setAmountInputSchema.safeParse({ ...base, amount: -1 }).success).toBe(false)
    expect(setAmountInputSchema.safeParse({ ...base, amount: 1.5 }).success).toBe(false)
    expect(setAmountInputSchema.safeParse({ ...base, amount: null }).success).toBe(true)
  })

  it('trie les lettres comme un tableur', () => {
    expect(['AA', 'B', 'A', 'Z'].sort(comparePrefixes)).toEqual(['A', 'B', 'Z', 'AA'])
    expect(comparePrefixes('A', 'A')).toBe(0)
  })
})

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
})

describe('rubrique en majuscules', () => {
  it('met la description de rubrique en majuscules, accents compris', () => {
    expect(
      createSectionInputSchema.parse({ prefix: 'A', description: ' asa iombonana ' }).description
    ).toBe('ASA IOMBONANA')
    expect(updateSectionInputSchema.parse({ id: 1, description: 'fiangonana é' }).description).toBe(
      'FIANGONANA É'
    )
  })
})
