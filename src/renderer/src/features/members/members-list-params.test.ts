import { describe, expect, it } from 'vitest'
import { listFromParams, paramsWith } from './members-list-params'

const params = (s: string) => new URLSearchParams(s)

describe('filtres et tri de la liste dans l’adresse', () => {
  it('lit les filtres et le tri, ignore les valeurs inconnues', () => {
    expect(
      listFromParams(
        params(
          'secteur=2&foyer=14&sexe=F&baptise=oui&communiant=non&diacre=oui&tri=matricule&ordre=desc'
        )
      )
    ).toEqual({
      sectorId: 2,
      householdNumber: 14,
      sex: 'F',
      baptized: true,
      communicant: false,
      deacon: true,
      sort: 'matricule',
      order: 'desc'
    })
    expect(listFromParams(params('secteur=abc&sexe=X&diacre=peut-etre&tri=age'))).toEqual({
      sort: 'name',
      order: 'asc'
    })
  })

  it('écrit seulement ce qui diffère du défaut', () => {
    expect(paramsWith(params(''), { deacon: true }).toString()).toBe('diacre=oui')
    expect(paramsWith(params('diacre=oui'), { deacon: undefined }).toString()).toBe('')
    expect(paramsWith(params(''), { sort: 'name', order: 'asc' }).toString()).toBe('')
    expect(paramsWith(params(''), { sort: 'birthDate', order: 'desc' }).toString()).toBe(
      'tri=birthDate&ordre=desc'
    )
  })
})
