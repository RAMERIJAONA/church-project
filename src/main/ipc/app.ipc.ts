import type { AppInfoDTO, PrintResultDTO } from '@shared/ipc/contract'
import type { Handle } from './handle'

export function registerAppIpc(
  handle: Handle,
  info: AppInfoDTO,
  print: () => Promise<PrintResultDTO['status']>
): void {
  handle('app.info', () => info)
  handle('app.print', async () => ({ status: await print() }))
}
