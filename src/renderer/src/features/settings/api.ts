import { invoke } from '@renderer/lib/ipc-client'
import type { AppSettingsPatch } from '@shared/domain/settings/settings.types'

export const settingsApi = {
  get: () => invoke('settings.get', undefined),
  update: (patch: AppSettingsPatch) => invoke('settings.update', patch),
  appInfo: () => invoke('app.info', undefined)
}
