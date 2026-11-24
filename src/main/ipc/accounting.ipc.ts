import type { AccountingService } from '@main/services/accounting.service'
import type { Handle } from './handle'

export function registerAccountingIpc(handle: Handle, accounting: AccountingService): void {
  handle('accounting.sheet', ({ year }) => accounting.getSheet(year))
  handle('accounting.createSection', (input) => accounting.createSection(input))
  handle('accounting.updateSection', ({ id, description }) => {
    accounting.updateSection(id, description)
    return null
  })
  handle('accounting.deleteSection', ({ id }) => {
    accounting.deleteSection(id)
    return null
  })
  handle('accounting.moveSection', ({ id, direction }) => accounting.moveSection(id, direction))
  handle('accounting.createLine', (input) => accounting.createLine(input))
  handle('accounting.updateLine', ({ id, description }) => {
    accounting.updateLine(id, description)
    return null
  })
  handle('accounting.deleteLine', ({ id }) => {
    accounting.deleteLine(id)
    return null
  })
  handle('accounting.moveLine', ({ id, direction }) => accounting.moveLine(id, direction))
  handle('accounting.setAmount', (input) => {
    accounting.setAmount(input)
    return null
  })
}
