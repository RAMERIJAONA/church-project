import type { AccountingExportService } from '@main/services/accounting-export.service'
import type { AccountingSummaryService } from '@main/services/accounting-summary.service'
import type { AccountingService } from '@main/services/accounting.service'
import type { Logger } from '@main/logging/logger'
import type { MaintenanceService } from '@main/services/maintenance.service'
import type { HouseholdsService } from '@main/services/households.service'
import type { MembersService } from '@main/services/members.service'
import type { SectorsService } from '@main/services/sectors.service'
import type { SettingsService } from '@main/services/settings.service'
import type { AppInfoDTO, PrintResultDTO } from '@shared/ipc/contract'
import type { IpcMain } from 'electron'
import { registerAccountingIpc } from './accounting.ipc'
import { registerAppIpc } from './app.ipc'
import { createHandle } from './handle'
import { registerHouseholdsIpc } from './households.ipc'
import { registerMaintenanceIpc } from './maintenance.ipc'
import { registerMembersIpc } from './members.ipc'
import { registerSectorsIpc } from './sectors.ipc'
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
  /** Fidèles, foyers et secteurs (indépendants de la comptabilité) */
  members: MembersService
  households: HouseholdsService
  sectors: SectorsService
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
  registerMembersIpc(handle, services.members)
  registerHouseholdsIpc(handle, services.households)
  registerSectorsIpc(handle, services.sectors)
}
