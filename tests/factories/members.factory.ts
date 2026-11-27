import type { HouseholdDTO } from '@shared/domain/members/households.types'
import type { SearchEntry } from '@shared/domain/members/members.search'
import type { CreateMemberInput, MemberDTO } from '@shared/domain/members/members.types'

/** Utilisables côté renderer comme côté main (aucune dépendance DB). Données fictives. */
export function makeMemberInput(
  overrides: Partial<CreateMemberInput> & Pick<CreateMemberInput, 'householdId'>
): CreateMemberInput {
  return {
    role: 'child',
    sex: 'M',
    lastName: 'RAKOTO',
    firstName: 'Tiana',
    birthDate: '1985-03-12',
    address: 'Lot II A 45, Ambatondrazaka',
    ...overrides
  }
}

export function makeMemberDTO(overrides: Partial<MemberDTO> = {}): MemberDTO {
  return {
    id: 1,
    householdId: 1,
    householdNumber: 1,
    role: 'child',
    rank: 3,
    sex: 'M',
    lastName: 'RAKOTO',
    firstName: 'Tiana',
    birthDate: '1985-03-12',
    address: 'Lot II A 45, Ambatondrazaka',
    phone: '+261341234567',
    baptized: true,
    communicant: false,
    deacon: false,
    sector: { id: 1, number: 1, name: 'Ambodimanga', numeral: 'I' },
    sponsor: null,
    matricule: '1/3B-I',
    createdAt: '2026-11-27T09:00:00.000Z',
    updatedAt: '2026-11-27T09:00:00.000Z',
    ...overrides
  }
}

/** Entrée de l'index de recherche de la liste globale. */
export function makeSearchEntry(
  overrides: Partial<SearchEntry> & Pick<SearchEntry, 'id'>
): SearchEntry {
  return {
    lastName: 'RAKOTO',
    firstName: 'Tiana',
    matricule: '1/3-I',
    householdId: 1,
    householdNumber: 1,
    rank: 3,
    sectorId: 1,
    sectorNumber: 1,
    sex: 'M',
    baptized: false,
    communicant: false,
    deacon: false,
    birthDate: '1985-03-12',
    ...overrides
  }
}

/** Foyer ouvert (renderer) : foyer 1, secteur I Ambodimanga, sans parrain ni membre. */
export function makeHouseholdDTO(overrides: Partial<HouseholdDTO> = {}): HouseholdDTO {
  const members = overrides.members ?? []
  return {
    id: 1,
    number: 1,
    sector: { id: 1, number: 1, name: 'Ambodimanga', numeral: 'I' },
    sponsor: null,
    memberCount: members.length,
    mainLastName: members[0]?.lastName ?? null,
    members,
    takenRanks: members.map((m) => m.rank),
    lastChildRank: Math.max(2, ...members.filter((m) => m.role === 'child').map((m) => m.rank)),
    ...overrides
  }
}
