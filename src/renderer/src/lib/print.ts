import { invoke } from './ipc-client'

/** Ouvre la boîte de dialogue d'impression du système (imprimante ou PDF). */
export async function printPage(): Promise<'printed' | 'cancelled'> {
  const { status } = await invoke('app.print', undefined)
  return status
}
