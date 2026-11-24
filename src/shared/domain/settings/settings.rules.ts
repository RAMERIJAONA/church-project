import {
  appSettingsSchema,
  type AppSettings,
  type AppSettingsPatch,
  type FontSize
} from './settings.types'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  accent: 'indigo',
  density: 'comfortable',
  fontSize: 'normal'
}

/** Taille de police de base (px) appliquée sur <html> ; tout le reste est en rem. */
export const FONT_SIZE_PX: Record<FontSize, number> = { small: 13, normal: 14, large: 16 }

export interface StoredSetting {
  key: string
  /** JSON sérialisé */
  value: string
}

/**
 * Reconstruit les préférences depuis les lignes stockées. Toute valeur absente, illisible ou
 * obsolète (ex. accent supprimé dans une version ultérieure) retombe sur la valeur par défaut :
 * une ligne corrompue ne doit jamais empêcher l'app de démarrer.
 */
export function resolveSettings(rows: readonly StoredSetting[]): {
  settings: AppSettings
  invalidKeys: string[]
} {
  const settings: AppSettings = { ...DEFAULT_SETTINGS }
  const invalidKeys: string[] = []
  const shape = appSettingsSchema.shape

  for (const row of rows) {
    if (!(row.key in shape)) continue // clé d'une autre version : ignorée
    const key = row.key as keyof typeof shape
    let raw: unknown
    try {
      raw = JSON.parse(row.value)
    } catch {
      invalidKeys.push(row.key)
      continue
    }
    const parsed = shape[key].safeParse(raw)
    if (parsed.success) Object.assign(settings, { [key]: parsed.data })
    else invalidKeys.push(row.key)
  }
  return { settings, invalidKeys }
}

/** Lignes à écrire pour un patch (seulement les clés présentes). */
export function settingsPatchToRows(patch: AppSettingsPatch): StoredSetting[] {
  return Object.entries(patch)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({ key, value: JSON.stringify(value) }))
}
