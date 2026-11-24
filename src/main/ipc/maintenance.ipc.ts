import type { MaintenanceService } from '@main/services/maintenance.service'
import type { Handle } from './handle'

export function registerMaintenanceIpc(handle: Handle, maintenance: MaintenanceService): void {
  handle('backup.list', () => maintenance.listBackups())
  handle('backup.create', () => maintenance.backupNow())
  handle('backup.export', () => maintenance.exportBackup())
  handle('backup.restore', () => maintenance.restoreFromFile())
  handle('backup.openFolder', async () => {
    await maintenance.openBackupsFolder()
    return null
  })
  handle('app.openLogsFolder', async () => {
    await maintenance.openLogsFolder()
    return null
  })
}
