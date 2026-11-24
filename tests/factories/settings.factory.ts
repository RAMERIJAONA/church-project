import { DEFAULT_SETTINGS } from '@shared/domain/settings/settings.rules'
import type { AppSettings } from '@shared/domain/settings/settings.types'

/** Utilisable côté renderer comme côté main (aucune dépendance DB). */
export function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_SETTINGS, ...overrides }
}
