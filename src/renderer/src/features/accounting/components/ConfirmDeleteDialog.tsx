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
import { formatAmount } from '@shared/utils/money'

export type DeleteTarget =
  | { kind: 'item'; id: number; code: string; description: string; descendantCount: number }
  | { kind: 'entry'; id: number; itemCode: string; label: string | null; amount: number }

export interface ConfirmDeleteDialogProps {
  target: DeleteTarget | null
  onConfirm: (target: DeleteTarget) => void
  onCancel: () => void
}

function title(target: DeleteTarget): string {
  return target.kind === 'item'
    ? `Supprimer la rubrique ${target.code} ?`
    : `Supprimer cette saisie de ${target.itemCode} ?`
}

function consequence(target: DeleteTarget): string {
  if (target.kind === 'entry') {
    return `« ${target.label ?? 'Sans libellé'} », ${formatAmount(target.amount)}. Le total de la case sera recalculé.`
  }
  const children =
    target.descendantCount === 0
      ? 'Ses montants (toutes années) seront retirés.'
      : target.descendantCount === 1
        ? 'Sa sous-rubrique et les montants (toutes années) seront aussi retirés.'
        : `Ses ${target.descendantCount} sous-rubriques et les montants (toutes années) seront aussi retirés.`
  return `« ${target.description} ». ${children} Les rubriques suivantes seront renumérotées.`
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
              <AlertDialogTitle>{title(target)}</AlertDialogTitle>
              <AlertDialogDescription>{consequence(target)}</AlertDialogDescription>
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
