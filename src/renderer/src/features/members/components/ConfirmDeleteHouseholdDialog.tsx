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
import type { HouseholdSummaryDTO } from '@shared/domain/members/households.types'

export interface ConfirmDeleteHouseholdDialogProps {
  household: HouseholdSummaryDTO | null
  onConfirm: (household: HouseholdSummaryDTO) => void
  onCancel: () => void
}

function membersSentence(count: number): string {
  if (count === 0) return 'Ce foyer n’a aucun membre.'
  if (count === 1) return 'Son seul membre sera supprimé avec lui.'
  return `Ses ${count} membres seront supprimés avec lui.`
}

/**
 * Supprimer un foyer supprime aussi ses membres (porteur, 2026-11-27) : la confirmation le dit
 * avec leur nombre (focus par défaut sur « Annuler »).
 */
export function ConfirmDeleteHouseholdDialog({
  household,
  onConfirm,
  onCancel
}: ConfirmDeleteHouseholdDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={household !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        {household && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Supprimer le foyer {household.number}
                {household.mainName ? ` (${household.mainName})` : ''} ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {membersSentence(household.memberCount)} Ils disparaîtront des listes et de la
                recherche. Le numéro {household.number} ne sera jamais réattribué.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onConfirm(household)}>
                {household.memberCount > 0
                  ? 'Supprimer le foyer et ses membres'
                  : 'Supprimer le foyer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
