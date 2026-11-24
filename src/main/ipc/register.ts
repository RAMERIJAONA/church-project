import type { Logger } from '@main/logging/logger'
import type { SettingsService } from '@main/services/settings.service'
import type { AppInfoDTO } from '@shared/ipc/contract'
import type { IpcMain } from 'electron'
import { registerAppIpc } from './app.ipc'
import { createHandle } from './handle'
import { registerSettingsIpc } from './settings.ipc'

export interface IpcServices {
  appInfo: AppInfoDTO
  settings: SettingsService
}

/** Enregistre tous les canaux. Appelé une fois par main/index.ts. */
export function registerIpc(
  ipcMain: Pick<IpcMain, 'handle'>,
  logger: Logger,
  services: IpcServices
): void {
  const handle = createHandle(ipcMain, logger.child({ module: 'ipc' }))
  registerAppIpc(handle, services.appInfo)
  registerSettingsIpc(handle, services.settings)
}
