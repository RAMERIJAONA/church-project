import { describe, expect, it } from 'vitest'
import { makeSearchEntry } from '@tests/factories/members.factory'
import { filterAndSort } from './members.list'
import { buildSearchIndex } from './members.search'
import { listMembersInputSchema, type ListMembersInput } from './members.types'

const index = buildSearchIndex([
  makeSearchEntry({
    id: 1,
    lastName: 'RAKOTO',
    firstName: 'Jean',
    householdNumber: 10,
    rank: 1,
    sectorId: 2,
    sectorNumber: 2,
    deacon: true,
    communicant: true,
    baptized: true,
    birthDate: '1960-01-01'
  }),
  makeSearchEntry({
    id: 2,
    lastName: 'RASOA',
    firstName: 'Soa',
    sex: 'F',
    householdNumber: 2,
    rank: 2,
    birthDate: '1990-05-05',
    baptized: true
  }),
  makeSearchEntry({
    id: 3,
    lastName: 'ANDRY',
    firstName: 'Hery',
    householdNumber: 2,
    rank: 3,
    sectorId: 2,
    sectorNumber: 2,
    birthDate: '2015-07-07'
  }),
  makeSearchEntry({
    id: 4,
    lastName: 'RABE',
    firstName: 'Fara',
    sex: 'F',
    householdNumber: 10,
    rank: 3,
    sectorId: 2,
    sectorNumber: 2,
    birthDate: '1975-02-02'
  })
])

const run = (input: ListMembersInput, matched: number[] | null = null): number[] =>
  filterAndSort(index.entries, listMembersInputSchema.parse(input), matched)

describe('liste globale : filtres', () => {
  it('garde l’ordre alphabétique sans filtre', () => {
    expect(run({})).toEqual([3, 4, 1, 2])
  })

  it('combine les filtres (secteur et diacre)', () => {
    expect(run({ sectorId: 2 })).toEqual([3, 4, 1])
    expect(run({ sectorId: 2, deacon: true })).toEqual([1])
    expect(run({ sectorId: 2, deacon: false })).toEqual([3, 4])
  })

  it('filtre par foyer, sexe, baptême et communion', () => {
    expect(run({ householdNumber: 2 })).toEqual([3, 2])
    expect(run({ sex: 'F' })).toEqual([4, 2])
    expect(run({ baptized: false })).toEqual([3, 4])
    expect(run({ communicant: true })).toEqual([1])
  })

  it('garde l’ordre de pertinence d’une recherche', () => {
    expect(run({}, [2, 1])).toEqual([2, 1])
    expect(run({ sex: 'F' }, [2, 1])).toEqual([2])
  })
})

describe('liste globale : tri', () => {
  it('trie le matricule par foyer puis rang, en nombres (2/… avant 10/…)', () => {
    expect(run({ sort: 'matricule' })).toEqual([2, 3, 1, 4])
    expect(run({ sort: 'matricule', order: 'desc' })).toEqual([4, 1, 3, 2])
  })

  it('trie par date de naissance, du plus âgé au plus jeune', () => {
    expect(run({ sort: 'birthDate' })).toEqual([1, 4, 2, 3])
  })

  it('trie par secteur puis nom, et par foyer puis nom', () => {
    expect(run({ sort: 'sector' })).toEqual([2, 3, 4, 1])
    expect(run({ sort: 'household' })).toEqual([3, 2, 4, 1])
  })

  it('trie par nom à l’envers', () => {
    expect(run({ order: 'desc' })).toEqual([2, 1, 4, 3])
  })

  it('reste rapide sur 10 000 fidèles', () => {
    const big = buildSearchIndex(
      Array.from({ length: 10_000 }, (_, i) =>
        makeSearchEntry({
          id: i + 1,
          lastName: `NOM${i}`,
          householdNumber: (i * 7919) % 2500,
          sectorId: (i % 8) + 1
        })
      )
    )
    const start = performance.now()
    filterAndSort(
      big.entries,
      listMembersInputSchema.parse({ sectorId: 3, sort: 'matricule' }),
      null
    )
    expect(performance.now() - start).toBeLessThan(50)
  })
})
