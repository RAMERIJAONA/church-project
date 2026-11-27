/**
 * Dates d'opération (« AAAA-MM-JJ », date du calendrier, sans heure ni fuseau) et périodes
 * d'affichage des réalisations. Fonctions pures : la date du jour est toujours passée en
 * paramètre. Calculs faits en UTC sur des dates sans heure (aucun décalage de fuseau).
 */
import {
  calendarDateToUtc as toUtc,
  capitalize,
  localDateOf,
  utcToCalendarDate as fromUtc
} from '@shared/utils/dates'

// Helpers génériques déplacés dans shared/utils/dates (aussi utilisés par les fidèles)
export { isCalendarDate, localDateOf } from '@shared/utils/dates'

export type PeriodKind = 'day' | 'week' | 'month'

export interface DateRange {
  /** Inclus, « AAAA-MM-JJ » */
  from: string
  /** Inclus, « AAAA-MM-JJ » */
  to: string
}

const pad = (n: number, size = 2): string => String(n).padStart(size, '0')

/** Date d'opération proposée pour une réalisation de `year` : aujourd'hui, ramené dans l'année. */
export function defaultOperationDate(now: Date, year: number): string {
  const today = localDateOf(now)
  const first = `${pad(year, 4)}-01-01`
  const last = `${pad(year, 4)}-12-31`
  return today < first ? first : today > last ? last : today
}

function addDays(date: string, days: number): string {
  const d = toUtc(date)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUtc(d)
}

/** Période (jour, semaine du lundi au dimanche, mois) qui contient `anchor`. */
export function periodRange(kind: PeriodKind, anchor: string): DateRange {
  if (kind === 'day') return { from: anchor, to: anchor }
  const d = toUtc(anchor)
  if (kind === 'week') {
    const sinceMonday = (d.getUTCDay() + 6) % 7
    const from = addDays(anchor, -sinceMonday)
    return { from, to: addDays(from, 6) }
  }
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
  return { from: fromUtc(first), to: fromUtc(last) }
}

/**
 * Instants UTC qui bornent des jours LOCAUX (fuseau de la machine) : minuit du premier jour
 * (inclus) à minuit du lendemain du dernier (exclu), au format stocké (`toISOString`).
 * Sert à comparer une période du calendrier aux dates de saisie (`created_at`).
 */
export function localInstantRange(range: DateRange): DateRange {
  const midnight = (date: string): string => {
    const [y, m, d] = date.split('-').map(Number)
    const local = new Date(0)
    local.setFullYear(y ?? 0, (m ?? 1) - 1, d ?? 1)
    local.setHours(0, 0, 0, 0)
    return local.toISOString()
  }
  return { from: midnight(range.from), to: midnight(addDays(range.to, 1)) }
}

/** Date de référence de la période décalée de `delta` (mois : le 1er du mois visé). */
export function shiftPeriod(kind: PeriodKind, anchor: string, delta: number): string {
  if (kind === 'day') return addDays(anchor, delta)
  if (kind === 'week') return addDays(anchor, 7 * delta)
  const d = toUtc(anchor)
  return fromUtc(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1)))
}

const fmt = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' })
const dayLong = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const dayMonthYear = fmt({ day: 'numeric', month: 'long', year: 'numeric' })
const dayMonth = fmt({ day: 'numeric', month: 'long' })
const monthYear = fmt({ month: 'long', year: 'numeric' })

/**
 * Période quelconque : « Du 3 au 24 novembre 2026 », « Du 1 septembre 2025 au 31 août 2026 ».
 * Un seul jour : « Mardi 24 novembre 2026 ».
 */
export function rangeLabel(range: DateRange): string {
  const from = toUtc(range.from)
  const to = toUtc(range.to)
  if (range.from === range.to) return capitalize(dayLong.format(from))
  const start =
    from.getUTCFullYear() !== to.getUTCFullYear()
      ? dayMonthYear.format(from)
      : from.getUTCMonth() !== to.getUTCMonth()
        ? dayMonth.format(from)
        : String(from.getUTCDate())
  return `Du ${start} au ${dayMonthYear.format(to)}`
}

/** « Mardi 24 novembre 2026 », « Semaine du 23 au 29 novembre 2026 », « Novembre 2026 ». */
export function periodLabel(kind: PeriodKind, range: DateRange): string {
  if (kind === 'day') return capitalize(dayLong.format(toUtc(range.from)))
  if (kind === 'month') return capitalize(monthYear.format(toUtc(range.from)))
  return `Semaine ${rangeLabel(range).replace(/^Du /, 'du ')}`
}

/** Grille du mois de `anchor` pour un calendrier : semaines du lundi au dimanche (4 à 6). */
export function monthGrid(anchor: string): string[][] {
  const month = periodRange('month', anchor)
  const weeks: string[][] = []
  for (let start = periodRange('week', month.from).from; start <= month.to;) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    weeks.push(week)
    start = addDays(start, 7)
  }
  return weeks
}
