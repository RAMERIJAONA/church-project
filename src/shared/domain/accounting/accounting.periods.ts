/**
 * Dates d'opération (« AAAA-MM-JJ », date du calendrier, sans heure ni fuseau) et périodes
 * d'affichage des réalisations. Fonctions pures : la date du jour est toujours passée en
 * paramètre. Calculs faits en UTC sur des dates sans heure (aucun décalage de fuseau).
 */
import { capitalize } from '@shared/utils/dates'

export type PeriodKind = 'day' | 'week' | 'month'

export interface DateRange {
  /** Inclus, « AAAA-MM-JJ » */
  from: string
  /** Inclus, « AAAA-MM-JJ » */
  to: string
}

const pad = (n: number, size = 2): string => String(n).padStart(size, '0')

/** Date du calendrier LOCAL (fuseau de la machine) d'un instant. */
export function localDateOf(instant: Date): string {
  return `${pad(instant.getFullYear(), 4)}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`
}

/** Date d'opération proposée pour une réalisation de `year` : aujourd'hui, ramené dans l'année. */
export function defaultOperationDate(now: Date, year: number): string {
  const today = localDateOf(now)
  const first = `${pad(year, 4)}-01-01`
  const last = `${pad(year, 4)}-12-31`
  return today < first ? first : today > last ? last : today
}

/** « 2026-11-24 » → Date à minuit UTC (pour l'arithmétique et l'affichage en UTC). */
function toUtc(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1))
}

function fromUtc(date: Date): string {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Vrai si « AAAA-MM-JJ » est une date existante du calendrier (pas de 29 février 2026). */
export function isCalendarDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && fromUtc(toUtc(date)) === date
}

/** Nombre de jours de la période, bornes incluses (1 pour un seul jour). */
export function rangeLength(range: DateRange): number {
  return Math.round((toUtc(range.to).getTime() - toUtc(range.from).getTime()) / 86_400_000) + 1
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

/** « Mardi 24 novembre 2026 », « Semaine du 23 au 29 novembre 2026 », « Novembre 2026 ». */
export function periodLabel(kind: PeriodKind, range: DateRange): string {
  const from = toUtc(range.from)
  const to = toUtc(range.to)
  if (kind === 'day') return capitalize(dayLong.format(from))
  if (kind === 'month') return capitalize(monthYear.format(from))
  const start =
    from.getUTCFullYear() !== to.getUTCFullYear()
      ? dayMonthYear.format(from)
      : from.getUTCMonth() !== to.getUTCMonth()
        ? dayMonth.format(from)
        : String(from.getUTCDate())
  return `Semaine du ${start} au ${dayMonthYear.format(to)}`
}
