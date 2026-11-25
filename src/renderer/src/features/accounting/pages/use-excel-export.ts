import { toast } from 'sonner'
import { getErrorMessage } from '@renderer/lib/error-messages'
import type { ExportSheetInput } from '@shared/domain/accounting/accounting.export'
import { useExportExcel } from '../queries'

/** Export Excel du tableau affiché, avec message à l'utilisateur. Annulation : rien à dire. */
export function useExcelExport(): { run: (input: ExportSheetInput) => void; pending: boolean } {
  const { mutate, isPending } = useExportExcel()
  return {
    pending: isPending,
    run: (input) =>
      mutate(input, {
        onSuccess: (result) => {
          if (result.status === 'saved') {
            toast.success('Tableau exporté en Excel', { description: result.path })
          }
        },
        onError: (err) => {
          toast.error(getErrorMessage(err))
        }
      })
  }
}
