/**
 * Lignes lues par `members.repository.ts` → DTO : secteur du foyer, parrain du foyer (s'il est
 * actif) et matricules calculés (jamais stockés). Fonctions pures.
 */
import type { MemberRole, Sex } from '@shared/domain/members/households.rules'
import type { SponsorDTO } from '@shared/domain/members/households.types'
import { matricule } from '@shared/domain/members/members.rules'
import type { SearchEntry } from '@shared/domain/members/members.search'
import type { MemberDTO } from '@shared/domain/members/members.types'
import { toRoman } from '@shared/utils/roman'

/** Fidèle joint à son foyer, au secteur du foyer et au parrain (jointure externe). */
export interface MemberReadRow {
  id: number
  householdId: number
  householdNumber: number
  role: MemberRole
  rank: number
  sex: Sex
  lastName: string
  firstName: string
  birthDate: string
  address: string
  phone: string | null
  baptized: boolean
  communicant: boolean
  deacon: boolean
  createdAt: string
  updatedAt: string
  sectorId: number
  sectorNumber: number
  sectorName: string
  sponsorId: number | null
  sponsorLastName: string | null
  sponsorFirstName: string | null
  sponsorRank: number | null
  sponsorBaptized: boolean | null
  sponsorCommunicant: boolean | null
  sponsorHouseholdNumber: number | null
  sponsorSectorNumber: number | null
}

function sponsorOf(r: MemberReadRow): SponsorDTO | null {
  const {
    sponsorId: id,
    sponsorLastName: lastName,
    sponsorFirstName: firstName,
    sponsorRank: rank,
    sponsorHouseholdNumber: householdNumber,
    sponsorSectorNumber: sectorNumber
  } = r
  if (
    id === null ||
    lastName === null ||
    firstName === null ||
    rank === null ||
    householdNumber === null ||
    sectorNumber === null
  ) {
    return null
  }
  const statuses = {
    baptized: r.sponsorBaptized ?? false,
    communicant: r.sponsorCommunicant ?? false
  }
  return {
    id,
    lastName,
    firstName,
    matricule: matricule({ householdNumber, rank, sectorNumber, ...statuses })
  }
}

export function toDTO(r: MemberReadRow): MemberDTO {
  return {
    id: r.id,
    householdId: r.householdId,
    householdNumber: r.householdNumber,
    role: r.role,
    rank: r.rank,
    sex: r.sex,
    lastName: r.lastName,
    firstName: r.firstName,
    birthDate: r.birthDate,
    address: r.address,
    phone: r.phone,
    baptized: r.baptized,
    communicant: r.communicant,
    deacon: r.deacon,
    sector: {
      id: r.sectorId,
      number: r.sectorNumber,
      name: r.sectorName,
      numeral: toRoman(r.sectorNumber)
    },
    sponsor: sponsorOf(r),
    matricule: matricule({
      householdNumber: r.householdNumber,
      rank: r.rank,
      baptized: r.baptized,
      communicant: r.communicant,
      sectorNumber: r.sectorNumber
    }),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }
}

/** Entrée de l'index en mémoire (recherche, filtres et tri de la liste globale). */
export function toSearchEntry(m: MemberDTO): SearchEntry {
  return {
    id: m.id,
    lastName: m.lastName,
    firstName: m.firstName,
    matricule: m.matricule,
    householdId: m.householdId,
    householdNumber: m.householdNumber,
    rank: m.rank,
    sectorId: m.sector.id,
    sectorNumber: m.sector.number,
    sex: m.sex,
    baptized: m.baptized,
    communicant: m.communicant,
    deacon: m.deacon,
    birthDate: m.birthDate
  }
}
