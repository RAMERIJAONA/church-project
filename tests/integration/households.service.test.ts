import { describe, expect, it } from 'vitest'
import { caught, setupMembers } from '@tests/helpers/members-context'

describe('HouseholdsService', () => {
  it('numérote les foyers 1, 2, 3 et ne réattribue jamais un numéro', () => {
    const { household, householdsService } = setupMembers()
    expect([household().number, household().number, household().number]).toEqual([1, 2, 3])
    householdsService.delete(3)
    expect(household().number).toBe(4)
  })

  it('crée un foyer sans parrain', () => {
    const { household } = setupMembers()
    expect(household()).toMatchObject({
      sponsor: null,
      memberCount: 0,
      members: [],
      mainName: null
    })
  })

  it('refuse un parrain qui n’est pas diacre', () => {
    const { household, member } = setupMembers()
    const jean = member(household().id, { role: 'father', firstName: 'Jean' })
    const err = caught(() => household({ sponsorId: jean.id }))
    expect(err.code).toBe('BUSINESS_RULE')
    expect(err.message).toBe('Le parrain doit être un diacre.')
  })

  it('refuse un secteur inconnu', () => {
    const { household } = setupMembers()
    expect(caught(() => household({ sectorId: 99 })).code).toBe('NOT_FOUND')
  })

  it('affiche le parrain et ses membres par rang', () => {
    const { household, member, householdsService } = setupMembers()
    const rabe = member(household().id, {
      role: 'father',
      lastName: 'RABE',
      firstName: 'Jean',
      deacon: true
    })
    const h = household({ sponsorId: rabe.id })
    member(h.id, { firstName: 'Andry' })
    member(h.id, { role: 'mother', sex: 'F', firstName: 'Soa' })
    const opened = householdsService.get(h.id)
    expect(opened.sponsor).toMatchObject({ lastName: 'RABE', matricule: '1/1M-I' })
    expect(opened.members.map((m) => m.matricule)).toEqual(['2/2-I', '2/3-I'])
    expect(opened).toMatchObject({
      memberCount: 2,
      mainName: 'RAKOTO Soa',
      takenRanks: [2, 3],
      lastChildRank: 3
    })
  })

  it('nomme le foyer par le nom et le prénom du chef de foyer ou du père', () => {
    const { household, member, listHouseholds } = setupMembers()
    const h = household()
    member(h.id, { firstName: 'Andry' })
    member(h.id, { role: 'mother', sex: 'F', firstName: 'Soa' })
    expect(listHouseholds().items[0]?.mainName).toBe('RAKOTO Soa')
    member(h.id, { role: 'father', firstName: 'Jean' })
    expect(listHouseholds().items[0]?.mainName).toBe('RAKOTO Jean')
  })

  it('propose seulement les diacres actifs comme parrains', () => {
    const { household, member, membersService, householdsService } = setupMembers()
    const h = household()
    const rabe = member(h.id, { role: 'father', lastName: 'RABE', firstName: 'Jean', deacon: true })
    member(h.id, { firstName: 'Andry' })
    const rasoa = member(h.id, { lastName: 'RASOA', firstName: 'Nirina', deacon: true })
    membersService.delete(rasoa.id)
    expect(householdsService.sponsorCandidates('').map((s) => s.id)).toEqual([rabe.id])
    expect(householdsService.sponsorCandidates('rabe').map((s) => s.id)).toEqual([rabe.id])
    expect(householdsService.sponsorCandidates('andry')).toEqual([])
  })

  it('change le matricule de tous les membres quand le secteur change', () => {
    const { sector, household, member, updateHousehold, householdsService, list } = setupMembers()
    sector('Ambodimanga')
    const antanety = sector('Antanety')
    const h = household()
    member(h.id, { firstName: 'Andry' })
    member(h.id, { firstName: 'Nirina', baptized: true })
    updateHousehold({ id: h.id, sectorId: antanety.id, sponsorId: null })
    expect(householdsService.get(h.id).members.map((m) => m.matricule)).toEqual([
      '1/3-II',
      '1/4B-II'
    ])
    // L'index de recherche suit (matricule)
    expect(list({ search: '1/4B-II' }).items.map((m) => m.firstName)).toEqual(['Nirina'])
  })

  it('supprime un foyer avec tous ses membres (porteur, 2026-11-27)', () => {
    const { household, member, householdsService, list, listHouseholds } = setupMembers()
    const h = household()
    const other = household()
    member(h.id, { role: 'father', firstName: 'Jean' })
    member(h.id, { firstName: 'Andry' })
    const kept = member(other.id, { lastName: 'RASOA', firstName: 'Nirina' })
    householdsService.delete(h.id)
    expect(caught(() => householdsService.get(h.id)).code).toBe('NOT_FOUND')
    expect(list().items.map((m) => m.id)).toEqual([kept.id])
    expect(list({ search: 'andry' }).total).toBe(0)
    expect(listHouseholds().items.map((x) => x.number)).toEqual([2])
    // Numéro jamais réattribué, noms libérés
    expect(household().number).toBe(3)
    expect(member(other.id, { firstName: 'Andry' }).lastName).toBe('RAKOTO')
  })

  it('un diacre supprimé avec son foyer ne parraine plus les autres foyers', () => {
    const { household, member, householdsService } = setupMembers()
    const h = household()
    const rabe = member(h.id, { role: 'father', lastName: 'RABE', firstName: 'Jean', deacon: true })
    const sponsored = household({ sponsorId: rabe.id })
    householdsService.delete(h.id)
    expect(householdsService.get(sponsored.id).sponsor).toBeNull()
  })

  it('refuse de supprimer un foyer inconnu', () => {
    const { householdsService } = setupMembers()
    expect(caught(() => householdsService.delete(99)).code).toBe('NOT_FOUND')
  })

  it('filtre par secteur et par parrain à désigner', () => {
    const { sector, household, member, listHouseholds } = setupMembers()
    sector('Ambodimanga')
    const antanety = sector('Antanety')
    const one = household()
    const rabe = member(one.id, {
      role: 'father',
      lastName: 'RABE',
      firstName: 'Jean',
      deacon: true
    })
    household({ sectorId: antanety.id, sponsorId: rabe.id })
    household({ sectorId: antanety.id })
    expect(listHouseholds({ sectorId: antanety.id }).items.map((h) => h.number)).toEqual([2, 3])
    expect(listHouseholds({ sponsorMissing: true }).items.map((h) => h.number)).toEqual([1, 3])
    expect(listHouseholds({ sectorId: antanety.id, sponsorMissing: true }).total).toBe(1)
  })

  it('cherche un foyer par numéro ou par le nom d’un membre', () => {
    const { household, member, listHouseholds } = setupMembers()
    const one = household()
    const two = household()
    member(one.id, { lastName: 'RAKOTO', firstName: 'Andry' })
    member(two.id, { lastName: 'RASOA', firstName: 'Nirina' })
    expect(listHouseholds({ search: '2' }).items.map((h) => h.number)).toEqual([2])
    expect(listHouseholds({ search: 'rakto' }).items.map((h) => h.number)).toEqual([1])
    expect(listHouseholds({ search: 'personne' }).total).toBe(0)
  })

  it('compte foyers et fidèles actifs par secteur', () => {
    const { sector, household, member, membersService, sectorsService } = setupMembers()
    const s = sector('Ambodimanga')
    const h = household({ sectorId: s.id })
    household({ sectorId: s.id })
    member(h.id, { firstName: 'Andry' })
    membersService.delete(member(h.id, { firstName: 'Nirina' }).id)
    expect(sectorsService.list()[0]).toMatchObject({ householdCount: 2, memberCount: 1 })
  })

  it('pagine la liste des foyers par numéro', () => {
    const { household, listHouseholds } = setupMembers()
    for (let i = 0; i < 55; i++) household()
    const page2 = listHouseholds({ page: 2 })
    expect(page2).toMatchObject({ total: 55, page: 2 })
    expect(page2.items.map((h) => h.number)).toEqual([51, 52, 53, 54, 55])
  })
})

describe('HouseholdsService : recherche sans tout charger', () => {
  /** Plus grand nombre de paramètres liés dans une requête préparée pendant `run`. */
  function maxParams(
    sqlite: ReturnType<typeof setupMembers>['handle']['sqlite'],
    run: () => void
  ): number {
    const original = sqlite.prepare.bind(sqlite)
    let max = 0
    sqlite.prepare = ((sql: string) => {
      max = Math.max(max, sql.split('?').length - 1)
      return original(sql)
    }) as typeof sqlite.prepare
    try {
      run()
    } finally {
      sqlite.prepare = original
    }
    return max
  }

  it('ne lit en base que les foyers et les diacres à afficher', () => {
    const { handle, household, member, householdsService, listHouseholds } = setupMembers()
    const h = household()
    for (let i = 0; i < 300; i++) {
      member(h.id, { lastName: `RAKOTO${String(i).padStart(3, '0')}`, deacon: i % 100 === 0 })
    }
    const params = maxParams(handle.sqlite, () => {
      expect(householdsService.sponsorCandidates('rakoto')).toHaveLength(3)
      expect(listHouseholds({ search: 'rakoto' }).total).toBe(1)
    })
    // Les 300 fidèles trouvés ne passent jamais en paramètres d'une requête
    expect(params).toBeLessThan(60)
  })
})
