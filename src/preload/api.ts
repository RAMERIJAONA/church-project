import type { Channel, IpcInput, IpcOutputs } from '@shared/ipc/contract'
import type { Result } from '@shared/ipc/result'

export interface WindowApi {
  invoke<C extends Channel>(channel: C, input: IpcInput<C>): Promise<Result<IpcOutputs[C]>>
}
