/**
 * Montants : entiers dans la plus petite unité (CLAUDE.md par. 7). L'Ariary n'a pas de
 * subdivision en usage : 1 = 1 Ar.
 */

/** Plafond de saisie (1 000 milliards - 1) : très au-dessus du besoin, sous MAX_SAFE_INTEGER. */
export const MAX_AMOUNT = 999_999_999_999

/**
 * Séparateur de milliers : espace insécable de largeur normale (U+00A0), bien visible
 * (« 2 000 000 »), jamais coupée en fin de ligne. Pas l'espace fine d'Intl, trop étroite.
 */
export const THOUSANDS_SEPARATOR = String.fromCharCode(0xa0)

const MAX_DIGITS = String(MAX_AMOUNT).length

/** « 2000000 » → « 2 000 000 » (chaîne de chiffres uniquement). */
export function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR)
}

/** « 2 000 000 » (sans unité : champs de saisie, qui affichent « Ar » à côté) */
export function formatAmount(amount: number): string {
  return groupDigits(String(amount))
}

/** Sigle de l'Ariary, la monnaie de tous les montants. */
export const CURRENCY = 'Ar'

/** « 2 000 000 Ar » : affichage d'un montant (tableaux, totaux, impression). Espace insécable. */
export function formatAriary(amount: number): string {
  return `${formatAmount(amount)}${THOUSANDS_SEPARATOR}${CURRENCY}`
}

/**
 * Montant en cours de frappe, reformaté à chaque touche : seuls les chiffres sont gardés
 * (12 au plus), groupés par 3. « 2000000 » → « 2 000 000 ». Les zéros de tête sont conservés
 * pendant la frappe (effacer le « 2 » de « 2 000 000 » pour taper « 3 » doit donner
 * « 3 000 000 ») ; le montant est normalisé à l'enregistrement.
 */
export function formatAmountTyping(text: string): string {
  return groupDigits(text.replace(/\D/g, '').slice(0, MAX_DIGITS))
}

// Chiffres seuls, ou groupes de 3 séparés par espace (y compris insécables), virgule ou point.
// Un séparateur mal placé (« 1,5 ») est refusé : on ne devine jamais une décimale.
const PLAIN = /^\d+$/
const GROUPED = /^\d{1,3}([ ,.]\d{3})+$/

export type ParsedAmount = { ok: true; value: number | null } | { ok: false }

/**
 * Lit un montant saisi au clavier : « 7654321 », « 7 654 321 », « 7,654,321 », « 7.654.321 ».
 * Vide → `null` (pas de montant). Refuse décimales, négatifs, lettres et montants trop grands.
 */
export function parseAmount(text: string): ParsedAmount {
  const raw = text.replace(/[\u00a0\u202f]/g, ' ').trim()
  if (raw === '') return { ok: true, value: null }
  if (!PLAIN.test(raw) && !GROUPED.test(raw)) return { ok: false }
  const value = Number(raw.replace(/[ ,.]/g, ''))
  if (!Number.isSafeInteger(value) || value > MAX_AMOUNT) return { ok: false }
  return { ok: true, value }
}
