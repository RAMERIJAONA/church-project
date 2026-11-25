import { toast } from 'sonner'
import type { PrintResultDTO } from '@shared/ipc/contract'
import { getErrorMessage } from './error-messages'
import { invoke } from './ipc-client'

/** Ouvre la boîte d'impression du système ; sans imprimante, propose un PDF (côté main). */
export function printPage(): Promise<PrintResultDTO> {
  return invoke('app.print', undefined)
}

/** Imprime et informe l'utilisateur (PDF enregistré, erreur). Annulation : rien à dire. */
export async function printWithFeedback(): Promise<void> {
  try {
    const result = await printPage()
    if (result.status === 'saved') {
      toast.success('Aucune imprimante installée : tableau enregistré en PDF', {
        description: result.path
      })
    }
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
