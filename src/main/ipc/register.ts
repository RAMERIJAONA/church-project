import type { AccountingExportService } from '@main/services/accounting-export.service'
import type { AccountingSummaryService } from '@main/services/accounting-summary.service'
import type { AccountingService } from '@main/services/accounting.service'
import type { Logger } from '@main/logging/logger'
import type { MaintenanceService } from '@main/services/maintenance.service'
import type { SettingsService } from '@main/services/settings.service'
import type { AppInfoDTO, PrintResultDTO } from '@shared/ipc/contract'
import type { IpcMain } from 'electron'
import { registerAccountingIpc } from './accounting.ipc'
import { registerAppIpc } from './app.ipc'
import { createHandle } from './handle'
import { registerMaintenanceIpc } from './maintenance.ipc'
import { registerSettingsIpc } from './settings.ipc'

export interface IpcServices {
  appInfo: AppInfoDTO
  /** Imprime la fenêtre, ou l'enregistre en PDF sans imprimante (print.service) */
  print: () => Promise<PrintResultDTO>
  settings: SettingsService
  maintenance: MaintenanceService
  accounting: AccountingService
  /** Export Excel du tableau affiché */
  accountingExport: AccountingExportService
  /** Synthèse prévu / réalisé par date de saisie */
  accountingSummary: AccountingSummaryService
}

/** Enregistre tous les canaux. Appelé une fois par main/index.ts. */
export function registerIpc(
  ipcMain: Pick<IpcMain, 'handle'>,
  logger: Logger,
  services: IpcServices
): void {
  const handle = createHandle(ipcMain, logger.child({ module: 'ipc' }))
  registerAppIpc(handle, services.appInfo, services.print)
  registerSettingsIpc(handle, services.settings)
  registerMaintenanceIpc(handle, services.maintenance)
  registerAccountingIpc(
    handle,
    services.accounting,
    services.accountingExport,
    services.accountingSummary
  )
}
