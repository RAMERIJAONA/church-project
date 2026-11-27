import type { CreateMemberInput, MemberDTO } from '@shared/domain/members/members.types'

/** Utilisables côté renderer comme côté main (aucune dépendance DB). Données fictives. */
export function makeMemberInput(overrides: Partial<CreateMemberInput> = {}): CreateMemberInput {
  return {
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
    lastName: 'RAKOTO',
    firstName: 'Tiana',
    birthDate: '1985-03-12',
    address: 'Lot II A 45, Ambatondrazaka',
    phone: '+261341234567',
    sector: 'Nord',
    baptized: true,
    communicant: false,
    registrationNumber: 'M-0042',
    createdAt: '2026-11-27T09:00:00.000Z',
    updatedAt: '2026-11-27T09:00:00.000Z',
    ...overrides
  }
}
