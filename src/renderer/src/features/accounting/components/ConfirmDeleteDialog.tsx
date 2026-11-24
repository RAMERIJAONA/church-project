import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'

export type DeleteTarget =
  | { kind: 'section'; id: number; code: string; description: string; lineCount: number }
  | { kind: 'line'; id: number; code: string; description: string }

export interface ConfirmDeleteDialogProps {
  target: DeleteTarget | null
  onConfirm: (target: DeleteTarget) => void
  onCancel: () => void
}

function consequence(target: DeleteTarget): string {
  if (target.kind === 'line') {
    return 'Son montant sera retiré pour toutes les années et les lignes suivantes seront renumérotées.'
  }
  const lines =
    target.lineCount === 0
      ? 'Elle ne contient aucune ligne.'
      : target.lineCount === 1
        ? 'Sa ligne et ses montants (toutes années) seront aussi retirés.'
        : `Ses ${target.lineCount} lignes et leurs montants (toutes années) seront aussi retirés.`
  return `${lines} Les rubriques suivantes de la même lettre seront renumérotées.`
}

/** Confirmation explicite avant toute suppression (focus par défaut sur « Annuler »). */
export function ConfirmDeleteDialog({
  target,
  onConfirm,
  onCancel
}: ConfirmDeleteDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        {target && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Supprimer {target.kind === 'section' ? 'la rubrique' : 'la ligne'} {target.code} ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                « {target.description} ». {consequence(target)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onConfirm(target)}>
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
