import type { Clock } from '@main/adapters/clock.adapter'
import type { Db } from '@main/db/client'
import type { Logger } from '@main/logging/logger'
import type { SettingsRepository } from '@main/repositories/settings.repository'
import { resolveSettings, settingsPatchToRows } from '@shared/domain/settings/settings.rules'
import type { AppSettings, AppSettingsPatch } from '@shared/domain/settings/settings.types'

export function createSettingsService(deps: {
  db: Db
  settings: SettingsRepository
  clock: Clock
  logger: Logger
}) {
  function read(db: Parameters<SettingsRepository['getAll']>[0]): AppSettings {
    const { settings, invalidKeys } = resolveSettings(deps.settings.getAll(db))
    if (invalidKeys.length > 0) {
      deps.logger.warn({ invalidKeys }, 'préférences illisibles ignorées (valeurs par défaut)')
    }
    return settings
  }

  return {
    get(): AppSettings {
      return read(deps.db)
    },

    update(patch: AppSettingsPatch): AppSettings {
      return deps.db.transaction((tx) => {
        deps.settings.upsertMany(tx, settingsPatchToRows(patch), deps.clock().toISOString())
        return read(tx)
      })
    }
  }
}

export type SettingsService = ReturnType<typeof createSettingsService>
