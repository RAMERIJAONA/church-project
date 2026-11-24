import { themeAttributes } from '@shared/domain/settings/settings.theme'
import type { AppSettings } from '@shared/domain/settings/settings.types'

/** Pose les attributs de thème sur <html>. Appelé au chargement puis à chaque changement. */
export function applyTheme(
  settings: AppSettings,
  root: HTMLElement = document.documentElement
): void {
  const attrs = themeAttributes(settings)
  root.dataset['theme'] = attrs.dataset.theme
  root.dataset['accent'] = attrs.dataset.accent
  root.dataset['density'] = attrs.dataset.density
  // Valeur réellement dynamique : style inline autorisé (CLAUDE.md par. 6)
  root.style.setProperty('--font-size-base', `${attrs.fontSizePx}px`)
}
