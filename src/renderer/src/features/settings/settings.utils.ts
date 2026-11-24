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
