import type { AccountingService } from '@main/services/accounting.service'
import type { Logger } from '@main/logging/logger'
import type { MaintenanceService } from '@main/services/maintenance.service'
import type { SettingsService } from '@main/services/settings.service'
import type { AppInfoDTO } from '@shared/ipc/contract'
import type { IpcMain } from 'electron'
import { registerAccountingIpc } from './accounting.ipc'
import { registerAppIpc } from './app.ipc'
import { createHandle } from './handle'
import { registerMaintenanceIpc } from './maintenance.ipc'
import { registerSettingsIpc } from './settings.ipc'

export interface IpcServices {
  appInfo: AppInfoDTO
  settings: SettingsService
  maintenance: MaintenanceService
  accounting: AccountingService
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
  registerMaintenanceIpc(handle, services.maintenance)
  registerAccountingIpc(handle, services.accounting)
}
