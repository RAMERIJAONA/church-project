/**
 * Comptabilité de l'église : arborescence de rubriques sur 4 niveaux et montants par année.
 *
 * Vocabulaire (français → malgache) :
 * - élément (`item`) : rubrique, sous-rubrique… (ex. « F1 ANATINY », « F1-I Mpitandrina »)
 * - un élément qui a des enfants est un groupe, sans montant ; un élément sans enfant porte des
 *   montants, à tous les niveaux (y compris une rubrique principale sans sous-rubrique).
 * - numéro (Laharana, « Lah. ») : calculé, jamais stocké (cf. accounting.codes.ts)
 * - description (Antony) : texte saisi
 * - saisie (`entry`) : un montant daté, avec un libellé facultatif. Le montant d'une case est la
 *   somme de ses saisies.
 */
import { z } from 'zod'
import { MAX_AMOUNT } from '@shared/utils/money'
import { AMOUNT_COLUMNS } from './accounting.columns'
import { isCalendarDate } from './accounting.periods'

export const MIN_YEAR = 1900
export const MAX_YEAR = 2200

export type ItemLevel = 1 | 2 | 3 | 4
export const MAX_DEPTH = 4

/**
 * Alphabet malgache (21 lettres : pas de C, Q, U, W, X), dans l'ordre d'attribution. Sert au
 * niveau 1 (A1, B1, D1…) et au niveau 4 (A), B), D)…). Au-delà de Z : AA, AB, AD…
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

/**
 * Comptabilité : sorties (dépenses, `expense`) ou entrées (recettes, `income`). Mêmes règles et
 * même affichage ; seule la numérotation du niveau 1 diffère (sorties A1, B1… ; entrées A2, B2…,
 * demande du porteur du 2026-11-25). Chaque comptabilité a ses propres lettres.
 */
export const LEDGERS = ['expense', 'income'] as const
export type Ledger = (typeof LEDGERS)[number]
export const ledgerSchema = z.enum(LEDGERS)

/** Estimation ou réalisation. « Estimation année prochaine » = `estimate` de l'année N+1. */
export const ENTRY_TYPES = ['estimate', 'actual'] as const
export type EntryType = (typeof ENTRY_TYPES)[number]

/** Lettre(s) d'un élément de niveau 1 : 1 à 3 lettres de l'alphabet malgache, en majuscules. */
export const sectionPrefixSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[ABD-PR-TVYZ]{1,3}$/, 'Lettre de l’alphabet malgache attendue')

/** Description (Antony). Mise en majuscules au niveau 1 par le service (`normalizeDescription`). */
export const descriptionSchema = z
  .string()
  .trim()
  .min(1, 'La description est obligatoire')
  .max(200, '200 caractères maximum')

/** Libellé d'une saisie : facultatif. Vide après nettoyage = pas de libellé (`null`). */
export const labelSchema = z
  .string()
  .trim()
  .max(120, '120 caractères maximum')
  .transform((s) => (s === '' ? null : s))
  .nullable()

/** Date d'opération d'une réalisation : « AAAA-MM-JJ », date existante du calendrier. */
export const operationDateSchema = z
  .string()
  .refine(isCalendarDate, 'Date attendue au format AAAA-MM-JJ')

export const yearSchema = z.number().int().min(MIN_YEAR).max(MAX_YEAR)
export const amountSchema = z.number().int().min(0).max(MAX_AMOUNT)
export const entryTypeSchema = z.enum(ENTRY_TYPES)
const idSchema = z.number().int().positive()
const directionSchema = z.enum(['up', 'down'])

export const listSheetInputSchema = z.object({ year: yearSchema, ledger: ledgerSchema }).strict()
export const createItemInputSchema = z
  .object({
    /** `null` : élément de niveau 1 */
    parentId: idSchema.nullable(),
    /**
     * Niveau 1 uniquement, facultatif : la lettre est toujours la suivante (`nextLetter`, une
     * lettre par rubrique principale) ; si elle est donnée, le service refuse toute autre.
     */
    prefix: sectionPrefixSchema.optional(),
    /** Niveau 1 uniquement : comptabilité (les sous-rubriques héritent de leur parent) */
    ledger: ledgerSchema.optional(),
    description: descriptionSchema
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.parentId !== null && v.prefix !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['prefix'], message: 'Lettre réservée au niveau 1' })
    }
    if (v.parentId === null && v.ledger === undefined) {
      ctx.addIssue({ code: 'custom', path: ['ledger'], message: 'Comptabilité obligatoire' })
    }
    if (v.parentId !== null && v.ledger !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['ledger'],
        message: 'Une sous-rubrique hérite de la comptabilité de son parent'
      })
    }
  })
export const updateItemInputSchema = z
  .object({ id: idSchema, description: descriptionSchema })
  .strict()
export const idInputSchema = z.object({ id: idSchema }).strict()
export const moveInputSchema = z.object({ id: idSchema, direction: directionSchema }).strict()
const cellTarget = { itemId: idSchema, year: yearSchema, type: entryTypeSchema }
/** Total direct d'une case simple. `amount: null` vide la case. */
export const setTotalInputSchema = z
  .object({ ...cellTarget, amount: amountSchema.nullable() })
  .strict()
export const listEntriesInputSchema = z.object(cellTarget).strict()
/**
 * `operatedOn` : date d'opération d'une réalisation (dans l'année de la case), `null` pour une
 * estimation. Absente (cas de l'UI) : calculée par le service, aujourd'hui ramené dans l'année
 * à l'ajout, inchangée à la modification. Contrôlée par le service, qui connaît le type de la case.
 */
export const addEntryInputSchema = z
  .object({
    ...cellTarget,
    amount: amountSchema,
    label: labelSchema,
    operatedOn: operationDateSchema.nullable().optional()
  })
  .strict()
export const updateEntryInputSchema = z
  .object({
    id: idSchema,
    amount: amountSchema,
    label: labelSchema,
    operatedOn: operationDateSchema.nullable().optional()
  })
  .strict()
export const amountColumnSchema = z.enum(AMOUNT_COLUMNS)
/**
 * Vues par période : jours locaux (bornes incluses, de n'importe quelle durée) et colonne
 * affichée, Estimation N, Réalisation N ou Estimation N+1 (N : année de `from`).
 */
export const periodTotalsInputSchema = z
  .object({
    from: operationDateSchema,
    to: operationDateSchema,
    ledger: ledgerSchema,
    column: amountColumnSchema
  })
  .strict()
  .refine((r) => r.from <= r.to, 'Période invalide : la date de début suit la date de fin')

/** Instant ISO 8601 UTC au format stocké (`toISOString`, millisecondes comprises) : comparable
 * en texte aux colonnes `created_at`. */
const instantSchema = z.iso.datetime({ precision: 3 })
/**
 * Synthèse : saisies faites entre deux instants (`from` inclus, `to` exclu), pour l'année
 * `year` (estimation et réalisation) et l'année suivante (estimation).
 */
export const enteredTotalsInputSchema = z
  .object({ ledger: ledgerSchema, year: yearSchema, from: instantSchema, to: instantSchema })
  .strict()
  .refine((r) => r.from < r.to, 'Période invalide : la date de début suit la date de fin')

export type MoveDirection = z.infer<typeof directionSchema>
export type CreateItemInput = z.infer<typeof createItemInputSchema>
export type SetTotalInput = z.infer<typeof setTotalInputSchema>
export type ListEntriesInput = z.infer<typeof listEntriesInputSchema>
export type AddEntryInput = z.infer<typeof addEntryInputSchema>
export type UpdateEntryInput = z.infer<typeof updateEntryInputSchema>
export type PeriodTotalsInput = z.infer<typeof periodTotalsInputSchema>
export type EnteredTotalsInput = z.infer<typeof enteredTotalsInputSchema>

/** Une case du tableau (un type, une année). */
export interface CellDTO {
  /** Somme des saisies, `null` si aucune */
  total: number | null
  entryCount: number
  /** Plusieurs saisies ou une saisie avec libellé : modifiable seulement depuis le détail */
  detailed: boolean
  /** Dernière saisie ou modification (ISO 8601 UTC), `null` si aucune saisie */
  lastEntryAt: string | null
}

/** Les 3 colonnes de l'année affichée N. */
export interface ItemAmountsDTO {
  estimate: CellDTO
  actual: CellDTO
  /** Estimation de l'année N+1 */
  nextEstimate: CellDTO
}

export interface AccountingItemDTO {
  id: number
  /** « F1-II-1 A) » : calculé à la lecture, jamais stocké */
  code: string
  level: ItemLevel
  /** Lettre du niveau 1, `null` aux autres niveaux */
  prefix: string | null
  description: string
  /** `null` : groupe (a des enfants) */
  amounts: ItemAmountsDTO | null
  /** Niveau < 4 et aucune saisie active (toutes années) */
  canAddChild: boolean
  children: AccountingItemDTO[]
}

export interface AccountingSheetDTO {
  year: number
  ledger: Ledger
  /** Éléments de niveau 1 */
  items: AccountingItemDTO[]
}

export interface EntryDTO {
  id: number
  amount: number
  label: string | null
  /** Date d'opération « AAAA-MM-JJ » (réalisations) ; `null` pour une estimation */
  operatedOn: string | null
  /** ISO 8601 UTC */
  createdAt: string
  updatedAt: string
}

/** Somme des saisies d'un élément sur une période (date de saisie), pour la colonne choisie. */
export interface PeriodTotalDTO {
  itemId: number
  total: number
  entryCount: number
}

/**
 * Synthèse d'une période : somme des saisies actives faites pendant la période (date de saisie),
 * par ligne. `null` : aucune saisie.
 */
export interface EnteredTotalsDTO {
  /** Estimations de l'année N */
  estimate: number | null
  /** Réalisations de l'année N */
  actual: number | null
  /** Estimations de l'année N+1 */
  nextEstimate: number | null
}

export interface CreatedItemDTO {
  id: number
  code: string
}

export interface CreatedEntryDTO {
  id: number
}

export interface MoveResultDTO {
  moved: boolean
}
