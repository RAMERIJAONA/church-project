import type { AccountingExportService } from '@main/services/accounting-export.service'
import type { AccountingService } from '@main/services/accounting.service'
import type { Handle } from './handle'

export function registerAccountingIpc(
  handle: Handle,
  accounting: AccountingService,
  exporter: AccountingExportService
): void {
  handle('accounting.sheet', ({ year, ledger }) => accounting.getSheet(year, ledger))
  handle('accounting.createItem', (input) => accounting.createItem(input))
  handle('accounting.updateItem', ({ id, description }) => {
    accounting.updateItem(id, description)
    return null
  })
  handle('accounting.deleteItem', ({ id }) => {
    accounting.deleteItem(id)
    return null
  })
  handle('accounting.moveItem', ({ id, direction }) => accounting.moveItem(id, direction))
  handle('accounting.setTotal', (input) => {
    accounting.setTotal(input)
    return null
  })
  handle('accounting.entries', (input) => accounting.listEntries(input))
  handle('accounting.addEntry', (input) => accounting.addEntry(input))
  handle('accounting.updateEntry', (input) => {
    accounting.updateEntry(input)
    return null
  })
  handle('accounting.periodTotals', (range) => accounting.getPeriodTotals(range))
  handle('accounting.deleteEntry', ({ id }) => {
    accounting.deleteEntry(id)
    return null
  })
  handle('accounting.exportExcel', (input) => exporter.exportExcel(input))
}
