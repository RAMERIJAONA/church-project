import { describe, expect, it } from 'vitest'
import { caught, setupMembers } from '@tests/helpers/members-context'

describe('MembersService : enregistrement', () => {
  it('enregistre nom et prénom normalisés et le téléphone canonique', () => {
    const { household, member } = setupMembers()
    const m = member(household().id, {
      lastName: 'rakoto',
      firstName: 'rAkoto TiaNa',
      phone: '034 12 345 67'
    })
    expect(m).toMatchObject({
      lastName: 'RAKOTO',
      firstName: 'Rakoto Tiana',
      phone: '+261341234567',
      createdAt: '2026-11-27T09:00:00.000Z'
    })
  })

  it('refuse une date de naissance future', () => {
    const { household, member } = setupMembers()
    const err = caught(() => member(household().id, { birthDate: '2026-11-28' }))
    expect(err.code).toBe('VALIDATION')
    expect(err.details).toEqual({ field: 'birthDate' })
  })

  it('refuse un téléphone qui n’est pas malgache', () => {
    const { household, member } = setupMembers()
    const err = caught(() => member(household().id, { phone: '044 12 345 67' }))
    expect(err.code).toBe('VALIDATION')
    expect(err.details).toEqual({ field: 'phone' })
  })

  it('refuse un fidèle dans un foyer inconnu', () => {
    const { member } = setupMembers()
    expect(caught(() => member(99)).code).toBe('NOT_FOUND')
  })

  it('refuse un fidèle de même nom et prénom, même né un autre jour', () => {
    const { household, member, list } = setupMembers()
    const h = household()
    const first = member(h.id, { baptized: true })
    const err = caught(() =>
      member(h.id, { lastName: 'rakoto', firstName: 'tiana', birthDate: '1990-01-01' })
    )
    expect(err.code).toBe('CONFLICT')
    expect(err.message).toBe(
      'Un fidèle RAKOTO Tiana existe déjà (né le 12/03/1985, matricule 1/3B-I).'
    )
    expect(err.details).toEqual({ reason: 'name-taken', existing: first })
    expect(list().total).toBe(1)
  })

  it("libère le nom et le prénom d'un fidèle supprimé", () => {
    const { household, member, membersService, list } = setupMembers()
    const h = household()
    membersService.delete(member(h.id).id)
    member(h.id)
    expect(list().total).toBe(1)
  })

  it('modifier un fidèle sans rien changer ne crée pas de conflit', () => {
    const { household, member, update } = setupMembers()
    const m = member(household().id)
    expect(update(m, { address: 'Ambohitsara' })).toMatchObject({
      address: 'Ambohitsara',
      rank: 3,
      matricule: '1/3-I'
    })
  })

  it('refuse une modification qui donne le nom et le prénom d’un autre fidèle', () => {
    const { household, member, update } = setupMembers()
    const h = household()
    member(h.id)
    const other = member(h.id, { firstName: 'Andry' })
    const err = caught(() => update(other, { firstName: 'tiana' }))
    expect(err.code).toBe('CONFLICT')
    expect(err.details).toMatchObject({ reason: 'name-taken' })
  })

  it('horodate la modification avec l’horloge injectée', () => {
    const { household, member, update, clock } = setupMembers()
    const m = member(household().id)
    clock.set(new Date('2026-11-28T10:00:00.000Z'))
    expect(update(m, { address: 'Ambohitsara' })).toMatchObject({
      createdAt: '2026-11-27T09:00:00.000Z',
      updatedAt: '2026-11-28T10:00:00.000Z'
    })
  })

  it('fidèle introuvable', () => {
    const { household, member, update, membersService } = setupMembers()
    const m = member(household().id)
    membersService.delete(m.id)
    expect(caught(() => update(m)).code).toBe('NOT_FOUND')
    expect(caught(() => membersService.delete(m.id)).code).toBe('NOT_FOUND')
  })
})

describe('MembersService : liste et recherche', () => {
  it('pagine la liste triée par nom', () => {
    const { household, member, list } = setupMembers()
    const h = household()
    for (let i = 0; i < 120; i++) {
      member(h.id, { lastName: `NOM${String(119 - i).padStart(3, '0')}`, firstName: 'Tiana' })
    }
    const page3 = list({ page: 3 })
    expect(page3.total).toBe(120)
    expect(page3.items).toHaveLength(20)
    expect(page3.items[0]?.lastName).toBe('NOM100')
    expect(list().items[0]?.lastName).toBe('NOM000')
  })

  it('retrouve un fidèle malgré une faute de frappe', () => {
    const { household, member, list } = setupMembers()
    const h = household()
    member(h.id)
    member(h.id, { lastName: 'RASOA', firstName: 'Nirina' })
    const res = list({ search: 'rakto' })
    expect(res.items.map((m) => m.lastName)).toEqual(['RAKOTO'])
  })

  it('traite une recherche faite de ponctuation comme vide', () => {
    const { household, member, list } = setupMembers()
    member(household().id)
    expect(list({ search: ' - ' }).total).toBe(1)
  })

  it('met la recherche à jour après modification et suppression', () => {
    const { household, member, update, membersService, list } = setupMembers()
    const m = member(household().id)
    expect(list({ search: 'rakoto' }).total).toBe(1)
    update(m, { lastName: 'RASOA' })
    expect(list({ search: 'rakoto' }).total).toBe(0)
    expect(list({ search: 'rasoa' }).total).toBe(1)
    membersService.delete(m.id)
    expect(list({ search: 'rasoa' }).total).toBe(0)
  })

  it('pagine les résultats de recherche dans l’ordre de pertinence', () => {
    const { household, member, list } = setupMembers()
    const h = household()
    member(h.id, { lastName: 'RAKOTOMALALA', firstName: 'Jean' })
    member(h.id, { lastName: 'RAKOTO', firstName: 'Tiana' })
    const res = list({ search: 'rakoto', pageSize: 1 })
    expect(res.total).toBe(2)
    expect(res.items.map((m) => m.lastName)).toEqual(['RAKOTO'])
    expect(list({ search: 'rakoto', pageSize: 1, page: 2 }).items[0]?.lastName).toBe('RAKOTOMALALA')
  })

  it('renvoie les ids trouvés par la recherche (liste des foyers)', () => {
    const { household, member, membersService } = setupMembers()
    const h = household()
    const m = member(h.id)
    member(h.id, { lastName: 'RASOA', firstName: 'Nirina' })
    expect(membersService.searchIds('rakoto')).toEqual([m.id])
  })
})
