import type { SectorsService } from '@main/services/sectors.service'
import type { Handle } from './handle'

export function registerSectorsIpc(handle: Handle, sectors: SectorsService): void {
  handle('sectors.list', () => sectors.list())
  handle('sectors.create', (input) => sectors.create(input))
  handle('sectors.rename', (input) => sectors.rename(input))
}
