import type { DbHandle } from '@main/db/client'
import { settingsPatchToRows } from '@shared/domain/settings/settings.rules'
import type { AppSettings } from '@shared/domain/settings/settings.types'

/** Écrit des préférences directement en base (pour préparer un état). */
export function seedSettings(
  handle: DbHandle,
  settings: Partial<AppSettings>,
  updatedAt = '2026-11-24T09:00:00.000Z'
): void {
  const insert = handle.sqlite.prepare(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
  )
  for (const row of settingsPatchToRows(settings)) insert.run(row.key, row.value, updatedAt)
}
