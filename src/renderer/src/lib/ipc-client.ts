import type { Channel, IpcInput, IpcOutputs } from '@shared/ipc/contract'
import type { ErrorCode } from '@shared/ipc/result'

/** Erreur IPC typée : TanStack Query la reçoit comme une exception classique. */
export class IpcError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'IpcError'
  }
}

/** Appel IPC typé : Result → données, ou throw IpcError. */
export async function invoke<C extends Channel>(
  channel: C,
  input: IpcInput<C>
): Promise<IpcOutputs[C]> {
  const res = await window.api.invoke(channel, input)
  if (!res.ok) throw new IpcError(res.error.code, res.error.message, res.error.details)
  return res.data
}
