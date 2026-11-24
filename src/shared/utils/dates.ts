/** Formatage d'affichage fr-FR. Les dates stockées restent en ISO UTC (CLAUDE.md par. 7). */
const longDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' })
const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

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
