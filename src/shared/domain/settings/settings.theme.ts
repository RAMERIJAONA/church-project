import { DEFAULT_SETTINGS, FONT_SIZE_PX } from './settings.rules'
import { appSettingsSchema, type AppSettings } from './settings.types'

/** Attributs posés sur <html> : tokens.css réagit à data-theme / data-accent / data-density. */
export interface ThemeAttributes {
  dataset: { theme: string; accent: string; density: string }
  fontSizePx: number
}

export function themeAttributes(settings: AppSettings): ThemeAttributes {
  return {
    dataset: { theme: settings.theme, accent: settings.accent, density: settings.density },
    fontSizePx: FONT_SIZE_PX[settings.fontSize]
  }
}

/** Paramètres d'URL transmis par main au chargement (évite un flash de mauvais thème). */
export function settingsToQuery(settings: AppSettings): Record<string, string> {
  return { ...settings }
}

/** Lecture tolérante : toute valeur absente ou invalide retombe sur la valeur par défaut. */
export function settingsFromQuery(search: string): AppSettings {
  const params = new URLSearchParams(search)
  const out: AppSettings = { ...DEFAULT_SETTINGS }
  for (const key of Object.keys(appSettingsSchema.shape) as Array<keyof AppSettings>) {
    const parsed = appSettingsSchema.shape[key].safeParse(params.get(key))
    if (parsed.success) Object.assign(out, { [key]: parsed.data })
  }
  return out
}
