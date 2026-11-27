/** Fidèles dans leur foyer : rangs selon le rôle, matricules, parrains. */
import { describe, expect, it } from 'vitest'
import { swapChildRankInputSchema } from '@shared/domain/members/members.types'
import { caught, setupMembers } from '@tests/helpers/members-context'

describe('MembersService : foyers, rangs et matricules', () => {
  it('crée un foyer d’une personne', () => {
    const { household, member } = setupMembers()
    const m = member(household().id, { role: 'head', sex: 'F' })
    expect(m).toMatchObject({ rank: 1, role: 'head', householdNumber: 1, matricule: '1/1-I' })
    expect(m.sector).toEqual({ id: m.sector.id, number: 1, name: 'Ambodimanga', numeral: 'I' })
  })

  it('classe père, mère et enfants', () => {
    const { household, member } = setupMembers()
    const h = household()
    const matricules = [
      member(h.id, { role: 'father', firstName: 'Jean', baptized: true, communicant: true }),
      member(h.id, { role: 'mother', sex: 'F', firstName: 'Soa', baptized: true }),
      member(h.id, { firstName: 'Andry', baptized: true, communicant: true }),
      member(h.id, { firstName: 'Nirina' })
    ].map((m) => m.matricule)
    expect(matricules).toEqual(['1/1M-I', '1/2B-I', '1/3M-I', '1/4-I'])
  })

  it('crée un foyer sans père', () => {
    const { sector, household, member } = setupMembers()
    sector('Ambodimanga')
    const antanety = sector('Antanety')
    household()
    const h = household({ sectorId: antanety.id })
    expect(
      member(h.id, { role: 'mother', sex: 'F', firstName: 'Soa', baptized: true }).matricule
    ).toBe('2/2B-II')
    expect(member(h.id, { firstName: 'Andry' }).matricule).toBe('2/3-II')
  })

  it('ne réutilise jamais le rang d’un enfant', () => {
    const { household, member, membersService } = setupMembers()
    const h = household()
    const [a, b, c] = ['Andry', 'Nirina', 'Fara'].map((firstName) => member(h.id, { firstName }))
    membersService.delete(c!.id)
    expect(member(h.id, { firstName: 'Hery' }).rank).toBe(6)
    expect([membersService.get(a!.id).rank, membersService.get(b!.id).rank]).toEqual([3, 4])
  })

  it('refuse un deuxième rang 1', () => {
    const { household, member } = setupMembers()
    const h = household()
    const jean = member(h.id, { role: 'father', firstName: 'Jean' })
    const err = caught(() => member(h.id, { role: 'head', sex: 'F', firstName: 'Soa' }))
    expect(err.code).toBe('CONFLICT')
    expect(err.message).toBe('Ce foyer a déjà un rang 1 (Père ou Chef de foyer) : RAKOTO Jean.')
    expect(err.details).toEqual({ reason: 'rank-taken', existing: jean })
  })

  it('refuse un père de sexe féminin', () => {
    const { household, member } = setupMembers()
    const err = caught(() => member(household().id, { role: 'father', sex: 'F' }))
    expect(err.code).toBe('BUSINESS_RULE')
    expect(err.message).toBe('Le père est de sexe masculin.')
    expect(err.details).toEqual({ field: 'sex' })
  })

  it('échange deux enfants voisins', () => {
    const { household, member, membersService } = setupMembers()
    const h = household()
    const andry = member(h.id, { firstName: 'Andry' })
    const nirina = member(h.id, { firstName: 'Nirina' })
    const swap = (id: number, direction: 'up' | 'down') =>
      membersService.swapChildRank(swapChildRankInputSchema.parse({ id, direction }))
    swap(nirina.id, 'up')
    expect([membersService.get(andry.id).rank, membersService.get(nirina.id).rank]).toEqual([4, 3])
    expect(membersService.get(nirina.id).matricule).toBe('1/3-I')
    // Premier vers le haut, dernier vers le bas : sans effet ni erreur
    swap(nirina.id, 'up')
    swap(andry.id, 'down')
    expect([membersService.get(andry.id).rank, membersService.get(nirina.id).rank]).toEqual([4, 3])
    expect(member(h.id, { firstName: 'Hery' }).rank).toBe(5)
  })

  it('n’échange que des enfants', () => {
    const { household, member, membersService } = setupMembers()
    const h = household()
    const jean = member(h.id, { role: 'father', firstName: 'Jean' })
    member(h.id, { firstName: 'Andry' })
    const err = caught(() =>
      membersService.swapChildRank(
        swapChildRankInputSchema.parse({ id: jean.id, direction: 'down' })
      )
    )
    expect(err.code).toBe('BUSINESS_RULE')
  })

  it('change de rang quand le rôle change, et seulement alors', () => {
    const { household, member, update } = setupMembers()
    const h = household()
    const soa = member(h.id, { role: 'head', sex: 'F', firstName: 'Soa' })
    member(h.id, { firstName: 'Andry' })
    expect(update(soa, { address: 'Ambohitsara' }).role).toBe('head')
    const andry = member(h.id, { firstName: 'Nirina' })
    expect(update(soa, { role: 'mother' })).toMatchObject({ rank: 2, matricule: '1/2-I' })
    expect(update(andry, { role: 'father' })).toMatchObject({ rank: 1, matricule: '1/1-I' })
  })

  it('applique les statuts : diacre ⇒ communiant ⇒ baptisé', () => {
    const { household, member, update } = setupMembers()
    const m = member(household().id, { deacon: true, baptized: false, communicant: false })
    expect(m).toMatchObject({
      deacon: true,
      communicant: true,
      baptized: true,
      matricule: '1/3M-I'
    })
    // Désactiver diacre garde communiant et baptisé
    expect(update(m, { deacon: false })).toMatchObject({
      deacon: false,
      communicant: true,
      baptized: true
    })
  })

  it('met le matricule à jour quand un statut change', () => {
    const { household, member, update } = setupMembers()
    const m = member(household().id)
    expect(update(m, { baptized: true }).matricule).toBe('1/3B-I')
  })
})

describe('MembersService : parrains', () => {
  it('retire le parrainage quand le diacre perd son statut', () => {
    const { household, member, update, membersService } = setupMembers()
    const rabe = member(household().id, {
      role: 'father',
      lastName: 'RABE',
      firstName: 'Jean',
      deacon: true
    })
    const sponsored = [household({ sponsorId: rabe.id }), household({ sponsorId: rabe.id })]
    const child = member(sponsored[0]!.id, { firstName: 'Andry' })
    expect(membersService.get(child.id).sponsor).toMatchObject({
      id: rabe.id,
      matricule: '1/1M-I'
    })
    expect(membersService.sponsoredHouseholds(rabe.id)).toEqual([2, 3])

    update(rabe, { deacon: false })
    expect(membersService.get(child.id).sponsor).toBeNull()
    expect(membersService.sponsoredHouseholds(rabe.id)).toEqual([])
  })

  it('retire le parrainage quand le diacre est supprimé', () => {
    const { household, member, membersService } = setupMembers()
    const rabe = member(household().id, {
      role: 'father',
      lastName: 'RABE',
      firstName: 'Jean',
      deacon: true
    })
    const h = household({ sponsorId: rabe.id })
    const child = member(h.id, { firstName: 'Andry' })
    membersService.delete(rabe.id)
    expect(membersService.get(child.id).sponsor).toBeNull()
  })

  it('supprime le dernier membre d’un foyer qu’il parrainait', () => {
    const { household, member, membersService, repos, handle } = setupMembers()
    const h = household()
    const jean = member(h.id, { role: 'head', firstName: 'Jean', deacon: true })
    repos.households.setSponsor(handle.db, h.id, jean.id, '2026-11-27T09:00:00.000Z')
    membersService.delete(jean.id)
    expect(repos.households.findById(handle.db, h.id)).toMatchObject({ number: 1, sponsorId: null })
  })
})
