import { invoke } from '@renderer/lib/ipc-client'
import type { AppSettingsPatch } from '@shared/domain/settings/settings.types'

export const settingsApi = {
  get: () => invoke('settings.get', undefined),
  update: (patch: AppSettingsPatch) => invoke('settings.update', patch)
}

export const maintenanceApi = {
  listBackups: () => invoke('backup.list', undefined),
  createBackup: () => invoke('backup.create', undefined),
  exportBackup: () => invoke('backup.export', undefined),
  restoreBackup: () => invoke('backup.restore', undefined),
  openBackupsFolder: () => invoke('backup.openFolder', undefined),
  openLogsFolder: () => invoke('app.openLogsFolder', undefined)
}
