/** Types et schémas d'entrée des secteurs (contrat IPC). */
import { z } from 'zod'

export interface SectorDTO {
  id: number
  /** Ordre de création, jamais modifié */
  number: number
  /** « Ambohitsara Avaratra » */
  name: string
  /** `number` en chiffres romains : « II » */
  numeral: string
  /** Foyers actifs du secteur */
  householdCount: number
  /** Fidèles actifs des foyers du secteur */
  memberCount: number
}

const idSchema = z.number().int().positive()
const nameSchema = z.string().trim().min(1).max(80)

export const createSectorInputSchema = z.object({ name: nameSchema }).strict()
export const renameSectorInputSchema = z.object({ id: idSchema, name: nameSchema }).strict()

export type CreateSectorInput = z.input<typeof createSectorInputSchema>
export type CreateSectorParsed = z.output<typeof createSectorInputSchema>
export type RenameSectorInput = z.input<typeof renameSectorInputSchema>
export type RenameSectorParsed = z.output<typeof renameSectorInputSchema>
