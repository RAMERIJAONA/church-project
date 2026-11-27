import { describe, expect, it } from 'vitest'
import golden from './__golden__/search.json'
import {
  buildSearchIndex,
  isBlankQuery,
  normalizeForSearch,
  searchMembers,
  type SearchEntry
} from './members.search'

const index = buildSearchIndex(golden.entries)

describe('normalizeForSearch', () => {
  it('retire majuscules, accents et ponctuation', () => {
    expect(normalizeForSearch('  RÂKOTO  Jean-Pierre ')).toBe('rakoto jean pierre')
    expect(normalizeForSearch("M-0042 / l'été")).toBe('m 0042 l ete')
  })
})

describe('searchMembers (golden)', () => {
  it.each(golden.cases)('« $query » : $why', ({ query, ids }) => {
    expect(searchMembers(index, query)).toEqual(ids)
  })
})

describe('searchMembers', () => {
  it('traite une recherche faite de ponctuation comme vide', () => {
    expect(isBlankQuery('  - ')).toBe(true)
    expect(isBlankQuery('')).toBe(true)
    expect(isBlankQuery('ra')).toBe(false)
    expect(searchMembers(index, '  - ')).toEqual([])
  })

  it('trouve deux lettres au milieu d’un prénom (« oa » → Andry Soa)', () => {
    const small = buildSearchIndex([
      { id: 1, lastName: 'RAKOTO', firstName: 'Andry Soa', registrationNumber: null },
      { id: 2, lastName: 'RABE', firstName: 'Hery', registrationNumber: null }
    ])
    expect(searchMembers(small, 'oa')).toEqual([1])
  })

  it('cherche une seule lettre au début des mots seulement', () => {
    const small = buildSearchIndex([
      { id: 1, lastName: 'RAKOTO', firstName: 'Andry Soa', registrationNumber: null },
      { id: 2, lastName: 'RABE', firstName: 'Hery', registrationNumber: null }
    ])
    expect(searchMembers(small, 's')).toEqual([1])
    expect(searchMembers(small, 'y')).toEqual([])
  })

  it('ne tolère pas de faute sur un mot de moins de 4 lettres', () => {
    expect(searchMembers(index, 'hry')).toEqual([])
  })

  it('tolère deux fautes à partir de 8 lettres', () => {
    expect(searchMembers(index, 'andriamhfa')).toEqual([4])
  })

  it('reste rapide sur 10 000 fidèles', () => {
    const syllables = ['ra', 'ko', 'to', 'ma', 'la', 'na', 'ri', 'zo', 'fy', 'he', 'ry', 'ti']
    const word = (n: number, len: number): string =>
      Array.from({ length: len }, (_, k) => syllables[(n * 7 + k * 5) % syllables.length]).join('')
    const entries: SearchEntry[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: i + 1,
      lastName: word(i, 3 + (i % 4)).toUpperCase(),
      firstName: `${word(i + 3, 2)} ${word(i + 11, 3)}`,
      registrationNumber: i % 3 === 0 ? `M-${i}` : null
    }))
    const big = buildSearchIndex(entries)
    const start = performance.now()
    searchMembers(big, 'rakotomalal')
    // Borne large pour ne pas être aléatoire en CI ; la cible réelle est < 100 ms
    expect(performance.now() - start).toBeLessThan(150)
  })
})
