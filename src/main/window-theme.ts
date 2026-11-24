import type { Theme } from '@shared/domain/settings/settings.types'

/**
 * Couleur de fond de la fenêtre AVANT le chargement du CSS (évite le flash blanc).
 * Exception justifiée à « valeurs brutes uniquement dans tokens.css » : Electron exige un
 * hex, connu avant le renderer. Doit correspondre à --background de tokens.css (converti OKLCH → sRGB).
 */
export const WINDOW_BACKGROUND: Record<Theme, string> = {
  light: '#fbfaf8',
  dark: '#111419'
}
