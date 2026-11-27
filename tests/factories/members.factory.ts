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
