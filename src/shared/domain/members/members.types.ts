/** Types et schémas d'entrée des fidèles (contrat IPC). Indépendant de la comptabilité. */
import { z } from 'zod'
import { MEMBER_ROLES, SEXES, type MemberRole, type Sex } from './households.rules'
import type { SectorRef, SponsorDTO } from './households.types'

export interface MemberDTO {
  id: number
  householdId: number
  householdNumber: number
  role: MemberRole
  /** Rang dans le foyer, selon le rôle */
  rank: number
  sex: Sex
  /** Toujours en MAJUSCULES */
  lastName: string
  /** « Rakoto Tiana » */
  firstName: string
  /** « AAAA-MM-JJ », date du calendrier sans fuseau */
  birthDate: string
  address: string
  /** Forme stockée « +261341234567 », affichée « 034 12 345 67 » */
  phone: string | null
  baptized: boolean
  communicant: boolean
  deacon: boolean
  /** Secteur du foyer */
  sector: SectorRef
  /** Parrain du foyer, `null` : « Parrain à désigner » */
  sponsor: SponsorDTO | null
  /** Calculé, jamais stocké : « 1/3MB-I » */
  matricule: string
  createdAt: string
  updatedAt: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export const MEMBERS_PAGE_SIZE = 50

/** `details` d'une erreur `CONFLICT` des fidèles, lu par l'UI. */
export type MemberConflictDetails =
  { reason: 'name-taken'; existing: MemberDTO } | { reason: 'rank-taken'; existing: MemberDTO }

const idSchema = z.number().int().positive()

/** Champ facultatif : espaces retirés, vide → `null`. */
const nullIfEmpty = (v: string | null): string | null => (v === '' ? null : v)

const memberFields = {
  sex: z.enum(SEXES),
  lastName: z.string().trim().min(1).max(80),
  firstName: z.string().trim().min(1).max(80),
  /** Format seulement ; dates impossibles, futures ou avant 1900 : contrôlées par le service */
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ'),
  address: z.string().trim().min(1).max(200),
  /** Texte saisi ; normalisé et contrôlé par le service (`parsePhone`) */
  phone: z.string().trim().max(30).nullable().default(null).transform(nullIfEmpty),
  /** Normalisés par le service (`applyStatusRules`) : diacre ⇒ communiant ⇒ baptisé */
  baptized: z.boolean().default(false),
  communicant: z.boolean().default(false),
  deacon: z.boolean().default(false)
}

const roleSchema = z.enum(MEMBER_ROLES)

export const createMemberInputSchema = z
  .object({ householdId: idSchema, role: roleSchema, ...memberFields })
  .strict()
export const updateMemberInputSchema = z
  .object({ id: idSchema, role: roleSchema, ...memberFields })
  .strict()
export const memberIdInputSchema = z.object({ id: idSchema }).strict()
/** Déplacer un fidèle dans un autre foyer, avec son rôle dans ce foyer */
export const moveMemberInputSchema = z
  .object({ id: idSchema, householdId: idSchema, role: roleSchema })
  .strict()
/** Échanger le rang d'un enfant avec l'enfant voisin */
export const swapChildRankInputSchema = z
  .object({ id: idSchema, direction: z.enum(['up', 'down']) })
  .strict()
export const MEMBER_SORTS = ['name', 'matricule', 'birthDate', 'sector', 'household'] as const
export type MemberSort = (typeof MEMBER_SORTS)[number]

/** Liste globale : recherche, filtres (absents : tous), tri (nom par défaut). */
export const listMembersInputSchema = z
  .object({
    search: z.string().max(100).default(''),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(MEMBERS_PAGE_SIZE),
    sectorId: idSchema.optional(),
    householdNumber: z.number().int().min(1).optional(),
    sex: z.enum(SEXES).optional(),
    baptized: z.boolean().optional(),
    communicant: z.boolean().optional(),
    deacon: z.boolean().optional(),
    sort: z.enum(MEMBER_SORTS).default('name'),
    order: z.enum(['asc', 'desc']).default('asc')
  })
  .strict()

export type CreateMemberInput = z.input<typeof createMemberInputSchema>
export type CreateMemberParsed = z.output<typeof createMemberInputSchema>
export type UpdateMemberInput = z.input<typeof updateMemberInputSchema>
export type UpdateMemberParsed = z.output<typeof updateMemberInputSchema>
export type ListMembersInput = z.input<typeof listMembersInputSchema>
export type ListMembersParsed = z.output<typeof listMembersInputSchema>
export type MoveMemberInput = z.input<typeof moveMemberInputSchema>
export type MoveMemberParsed = z.output<typeof moveMemberInputSchema>
export type SwapChildRankInput = z.input<typeof swapChildRankInputSchema>
export type SwapChildRankParsed = z.output<typeof swapChildRankInputSchema>
