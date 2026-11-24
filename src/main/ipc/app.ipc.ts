import type { AppInfoDTO } from '@shared/ipc/contract'
import type { Handle } from './handle'

export function registerAppIpc(handle: Handle, info: AppInfoDTO): void {
  handle('app.info', () => info)
}
