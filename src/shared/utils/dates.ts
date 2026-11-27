/** Formatage d'affichage fr-FR. Les dates stockées restent en ISO UTC (CLAUDE.md par. 7). */
const longDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' })
const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

const shortDateTime = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

/** « 24/11/2026 14:05 » (cases du tableau : court, lisible à l'impression) */
export function formatShortDateTime(date: Date): string {
  return shortDateTime.format(date).replace(',', '')
}

/** « mardi 24 novembre 2026 » */
export function formatLongDate(date: Date): string {
  return longDate.format(date)
}

/** « 24 novembre 2026 à 14:05 » */
export function formatDateTime(date: Date): string {
  return dateTime.format(date)
}

/** Première lettre en majuscule (les jours/mois sont en minuscules en français). */
export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1)
}

const pad = (n: number, size = 2): string => String(n).padStart(size, '0')

/** Date du calendrier LOCAL (fuseau de la machine) d'un instant, « AAAA-MM-JJ ». */
export function localDateOf(instant: Date): string {
  return `${pad(instant.getFullYear(), 4)}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`
}

/** « 2026-11-24 » → Date à minuit UTC (pour l'arithmétique et l'affichage en UTC). */
export function calendarDateToUtc(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1))
}

/** Date à minuit UTC → « AAAA-MM-JJ ». */
export function utcToCalendarDate(date: Date): string {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Vrai si « AAAA-MM-JJ » est une date existante du calendrier (pas de 29 février 2026). */
export function isCalendarDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && utcToCalendarDate(calendarDateToUtc(date)) === date
}
