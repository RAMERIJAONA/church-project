/** Types et schémas d'entrée des foyers (contrat IPC). */
import { z } from 'zod'
import type { MemberDTO } from './members.types'

/** Secteur tel qu'il est rappelé sur un foyer ou un fidèle. */
export interface SectorRef {
  id: number
  number: number
  name: string
  /** « II » */
  numeral: string
}

/** Parrain d'un foyer : un fidèle diacre. */
export interface SponsorDTO {
  id: number
  lastName: string
  firstName: string
  matricule: string
}

/** Ligne de la liste des foyers. */
export interface HouseholdSummaryDTO {
  id: number
  number: number
  sector: SectorRef
  /** `null` : « Parrain à désigner » */
  sponsor: SponsorDTO | null
  /** Membres actifs */
  memberCount: number
  /** Nom du membre de plus petit rang, pour reconnaître le foyer : « Foyer 4 · RAKOTO » */
  mainLastName: string | null
}

/** Foyer ouvert : ses membres actifs par rang. */
export interface HouseholdDTO extends HouseholdSummaryDTO {
  members: MemberDTO[]
  /** Rangs occupés par les membres actifs (rôles disponibles dans la fiche) */
  takenRanks: number[]
  /** Plus haut rang jamais attribué à un enfant */
  lastChildRank: number
}

const idSchema = z.number().int().positive()

export const HOUSEHOLDS_PAGE_SIZE = 50

export const createHouseholdInputSchema = z
  .object({ sectorId: idSchema, sponsorId: idSchema.nullable().default(null) })
  .strict()
export const updateHouseholdInputSchema = z
  .object({ id: idSchema, sectorId: idSchema, sponsorId: idSchema.nullable() })
  .strict()
export const householdIdInputSchema = z.object({ id: idSchema }).strict()
export const listHouseholdsInputSchema = z
  .object({
    /** Numéro de foyer, ou nom d'un membre */
    search: z.string().max(100).default(''),
    sectorId: idSchema.optional(),
    /** Seulement les foyers « Parrain à désigner » */
    sponsorMissing: z.boolean().default(false),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(HOUSEHOLDS_PAGE_SIZE)
  })
  .strict()
export const sponsorCandidatesInputSchema = z
  .object({ search: z.string().max(100).default('') })
  .strict()

export type CreateHouseholdInput = z.input<typeof createHouseholdInputSchema>
export type CreateHouseholdParsed = z.output<typeof createHouseholdInputSchema>
export type UpdateHouseholdInput = z.input<typeof updateHouseholdInputSchema>
export type UpdateHouseholdParsed = z.output<typeof updateHouseholdInputSchema>
export type ListHouseholdsInput = z.input<typeof listHouseholdsInputSchema>
export type ListHouseholdsParsed = z.output<typeof listHouseholdsInputSchema>
export type SponsorCandidatesInput = z.input<typeof sponsorCandidatesInputSchema>
