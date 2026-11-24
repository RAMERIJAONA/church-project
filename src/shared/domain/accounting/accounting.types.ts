/**
 * Comptabilité de l'église (tableau des rubriques et des montants par année).
 *
 * Vocabulaire (français → malgache) :
 * - rubrique (parent, ex. « A1 - ASA IOMBONANA ») : regroupe des lignes, sans montant
 * - ligne (enfant, ex. « A1-1 Kitapo iombonana ») : porte un montant par année
 * - numéro (Laharana, « Lah. ») : lettre (alphabet malgache) et chiffres automatiques (A1, A1-1…)
 * - description (Antony) : texte saisi
 */
import { z } from 'zod'
import { MAX_AMOUNT } from '@shared/utils/money'

export const MIN_YEAR = 1900
export const MAX_YEAR = 2200

/**
 * Alphabet malgache (21 lettres : pas de C, Q, U, W, X), dans l'ordre d'attribution des
 * rubriques. Au-delà de Z : AA, AB, AD… (comme les colonnes d'un tableur).
 */
export const MALAGASY_LETTERS = [
  'A',
  'B',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'R',
  'S',
  'T',
  'V',
  'Y',
  'Z'
] as const

/** Lettre(s) d'une rubrique : 1 à 3 lettres de l'alphabet malgache, en majuscules. */
export const sectionPrefixSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[ABD-PR-TVYZ]{1,3}$/, 'Lettre de l’alphabet malgache attendue')

const DESCRIPTION_REQUIRED = 'La description est obligatoire'
const DESCRIPTION_MAX = '200 caractères maximum'

/** Description (Antony) d'une ligne : gardée telle que saisie. */
export const descriptionSchema = z
  .string()
  .trim()
  .min(1, DESCRIPTION_REQUIRED)
  .max(200, DESCRIPTION_MAX)

/** Description d'une rubrique : toujours en MAJUSCULES, quelle que soit la saisie. */
export const sectionDescriptionSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, DESCRIPTION_REQUIRED)
  .max(200, DESCRIPTION_MAX)

export const yearSchema = z.number().int().min(MIN_YEAR).max(MAX_YEAR)
export const amountSchema = z.number().int().min(0).max(MAX_AMOUNT)
const idSchema = z.number().int().positive()
const directionSchema = z.enum(['up', 'down'])

export const listSheetInputSchema = z.object({ year: yearSchema }).strict()
export const createSectionInputSchema = z
  .object({
    /** Lettre existante, ou la lettre suivante proposée (cf. `availableLetters`) */
    prefix: sectionPrefixSchema,
    description: sectionDescriptionSchema
  })
  .strict()
export const updateSectionInputSchema = z
  .object({ id: idSchema, description: sectionDescriptionSchema })
  .strict()
export const createLineInputSchema = z
  .object({
    sectionId: idSchema,
    description: descriptionSchema,
    /** Montant optionnel saisi en même temps que la ligne, pour `year`. */
    amount: amountSchema.nullable(),
    year: yearSchema
  })
  .strict()
export const updateLineInputSchema = z
  .object({ id: idSchema, description: descriptionSchema })
  .strict()
export const setAmountInputSchema = z
  .object({ lineId: idSchema, year: yearSchema, amount: amountSchema.nullable() })
  .strict()
export const idInputSchema = z.object({ id: idSchema }).strict()
export const moveInputSchema = z.object({ id: idSchema, direction: directionSchema }).strict()

export type MoveDirection = z.infer<typeof directionSchema>
export type CreateSectionInput = z.infer<typeof createSectionInputSchema>
export type CreateLineInput = z.infer<typeof createLineInputSchema>
export type SetAmountInput = z.infer<typeof setAmountInputSchema>

export interface AccountingLineDTO {
  id: number
  /** « A1-3 » : calculé à la lecture, jamais stocké */
  code: string
  description: string
  /** Montant de l'année demandée, `null` si non saisi */
  amount: number | null
}

export interface AccountingSectionDTO {
  id: number
  prefix: string
  /** « A1 » : calculé à la lecture, jamais stocké */
  code: string
  description: string
  lines: AccountingLineDTO[]
}

export interface AccountingSheetDTO {
  year: number
  sections: AccountingSectionDTO[]
}

export interface CreatedItemDTO {
  id: number
  code: string
}

export interface MoveResultDTO {
  moved: boolean
}
