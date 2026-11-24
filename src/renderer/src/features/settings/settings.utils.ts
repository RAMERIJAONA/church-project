import type { Accent, Density, FontSize, Theme } from '@shared/domain/settings/settings.types'

/** Libellés d'affichage FR. */
export const THEME_LABELS: Record<Theme, string> = { light: 'Clair', dark: 'Sombre' }
export const ACCENT_LABELS: Record<Accent, string> = {
  indigo: 'Indigo',
  green: 'Vert',
  amber: 'Ambre',
  rose: 'Rose'
}
export const DENSITY_LABELS: Record<Density, string> = {
  comfortable: 'Confortable',
  compact: 'Compacte'
}
export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small: 'Petite',
  normal: 'Normale',
  large: 'Grande'
}

const REASON_LABELS: Record<string, string> = {
  auto: 'Automatique',
  manuel: 'Manuelle',
  'avant-migration': 'Avant mise à jour',
  'avant-restauration': 'Avant restauration'
}

/** Raison lisible depuis le nom de fichier (`sauvegarde_<date>_<heure>_<raison>.db`). */
export function backupReasonLabel(fileName: string): string {
  const reason = /_([a-z-]+)\.db$/.exec(fileName)?.[1]
  return (reason && REASON_LABELS[reason]) ?? 'Sauvegarde'
}
