/**
 * Règles des fidèles (porteur, 2026-11-27). Fonctions pures, partagées par le formulaire
 * (aperçu) et le service (vérité). Aucun lien avec la comptabilité.
 */
import { isCalendarDate } from '@shared/utils/dates'

export const MIN_BIRTH_DATE = '1900-01-01'

export const PHONE_ERROR = 'Numéro invalide : 10 chiffres attendus, ex. 034 12 345 67.'

const collapseSpaces = (text: string): string => text.trim().replace(/\s+/g, ' ')

/** Nom toujours en MAJUSCULES : « rakoto » → « RAKOTO ». */
export function normalizeLastName(input: string): string {
  return collapseSpaces(input).toLocaleUpperCase('fr-FR')
}

/**
 * Prénom : majuscule au début de chaque mot (après une espace, un trait d'union ou une
 * apostrophe), le reste en minuscules : « rAkoto TiaNa » → « Rakoto Tiana ».
 */
export function normalizeFirstName(input: string): string {
  return collapseSpaces(input)
    .toLocaleLowerCase('fr-FR')
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, letter: string) => {
      return sep + letter.toLocaleUpperCase('fr-FR')
    })
}

/** « RAKOTO Tiana » */
export function memberDisplayName(m: { lastName: string; firstName: string }): string {
  return `${m.lastName} ${m.firstName}`
}

export type ParsedPhone = { ok: true; value: string | null } | { ok: false }

/** Les 9 chiffres significatifs d'un numéro malgache saisi, ou `null` s'il n'en est pas un. */
function significantDigits(input: string): string | null {
  let digits = input.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('261')) digits = digits.slice(3)
  else if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1)
  return /^[23]\d{8}$/.test(digits) ? digits : null
}

/**
 * Téléphone saisi (« 034 12 345 67 », « +261 34 12 345 67 », « 034.12.345.67 »…) → forme
 * stockée « +261341234567 ». Vide → `null`. Mobiles (3X) et fixes (20).
 */
export function parsePhone(input: string): ParsedPhone {
  if (input.trim() === '') return { ok: true, value: null }
  const digits = significantDigits(input)
  return digits === null ? { ok: false } : { ok: true, value: `+261${digits}` }
}

/** Groupes 3-2-3-2 d'une forme locale « 0341234567 » → « 034 12 345 67 ». */
function groupLocal(local: string): string {
  return [local.slice(0, 3), local.slice(3, 5), local.slice(5, 8), local.slice(8, 10)]
    .filter((part) => part !== '')
    .join(' ')
}

/** « +261341234567 » → « 034 12 345 67 » (affichage, toujours en forme locale). */
export function formatPhone(canonical: string): string {
  return groupLocal(`0${canonical.replace(/^\+261/, '')}`)
}

/**
 * Pendant la frappe, toujours en forme locale (au plus 10 chiffres) : « +26134123 » →
 * « 034 12 3 », « 3412 » → « 034 12 ».
 */
export function formatPhoneTyping(text: string): string {
  let digits = text.replace(/\D/g, '')
  if (digits.startsWith('261')) digits = `0${digits.slice(3)}`
  else if (digits.startsWith('3') || digits.startsWith('20')) digits = `0${digits}`
  return groupLocal(digits.slice(0, 10))
}

/** Message d'erreur de la date de naissance (« AAAA-MM-JJ »), `null` si elle est valide. */
export function birthDateError(date: string, today: string): string | null {
  if (!isCalendarDate(date)) return 'Date de naissance invalide.'
  if (date > today) return 'La date de naissance ne peut pas être dans le futur.'
  if (date < MIN_BIRTH_DATE) return 'La date de naissance ne peut pas être avant 1900.'
  return null
}

/** « 1985-03-12 » → « 12/03/1985 » */
export function formatBirthDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

/** Un membre communiant est toujours baptisé (porteur, 2026-11-27). */
export function communicantError(baptized: boolean, communicant: boolean): string | null {
  return communicant && !baptized ? 'Un membre communiant est toujours baptisé.' : null
}
