/** Types et schémas d'entrée des fidèles (contrat IPC). Indépendant de la comptabilité. */
import { z } from 'zod'

export interface MemberDTO {
  id: number
  /** Toujours en MAJUSCULES */
  lastName: string
  /** « Rakoto Tiana » */
  firstName: string
  /** « AAAA-MM-JJ », date du calendrier sans fuseau */
  birthDate: string
  address: string
  /** Forme stockée « +261341234567 », affichée « 034 12 345 67 » */
  phone: string | null
  /** Texte libre pour l'instant (liste des secteurs prévue plus tard) */
  sector: string | null
  baptized: boolean
  communicant: boolean
  registrationNumber: string | null
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
  | { reason: 'possible-duplicate'; existing: MemberDTO }
  | { reason: 'registration-number-taken'; existing: MemberDTO }

const idSchema = z.number().int().positive()

/** Champ facultatif : espaces retirés, vide → `null`. */
const nullIfEmpty = (v: string | null): string | null => (v === '' ? null : v)

const memberFields = {
  lastName: z.string().trim().min(1).max(80),
  firstName: z.string().trim().min(1).max(80),
  /** Format seulement ; dates impossibles, futures ou avant 1900 : contrôlées par le service */
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ'),
  address: z.string().trim().min(1).max(200),
  /** Texte saisi ; normalisé et contrôlé par le service (`parsePhone`) */
  phone: z.string().trim().max(30).nullable().default(null).transform(nullIfEmpty),
  sector: z.string().trim().max(80).nullable().default(null).transform(nullIfEmpty),
  registrationNumber: z.string().trim().max(40).nullable().default(null).transform(nullIfEmpty),
  baptized: z.boolean().default(false),
  communicant: z.boolean().default(false),
  /** `true` : enregistrer malgré un fidèle de même nom, prénom et date de naissance */
  confirmDuplicate: z.boolean().default(false)
}

export const createMemberInputSchema = z.object(memberFields).strict()
export const updateMemberInputSchema = z.object({ id: idSchema, ...memberFields }).strict()
export const memberIdInputSchema = z.object({ id: idSchema }).strict()
export const listMembersInputSchema = z
  .object({
    search: z.string().max(100).default(''),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(MEMBERS_PAGE_SIZE)
  })
  .strict()

export type CreateMemberInput = z.input<typeof createMemberInputSchema>
export type CreateMemberParsed = z.output<typeof createMemberInputSchema>
export type UpdateMemberInput = z.input<typeof updateMemberInputSchema>
export type UpdateMemberParsed = z.output<typeof updateMemberInputSchema>
export type ListMembersInput = z.input<typeof listMembersInputSchema>
export type ListMembersParsed = z.output<typeof listMembersInputSchema>
