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
import { memberDisplayName } from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'
import { householdNumbersLabel } from '../members.utils'

export interface ConfirmDeleteMemberDialogProps {
  member: MemberDTO | null
  /** Foyers que parraine ce fidèle : ils passeront « à désigner » */
  sponsoredHouseholds: number[]
  onConfirm: (member: MemberDTO) => void
  onCancel: () => void
}

/** Confirmation explicite avant de supprimer un fidèle (focus par défaut sur « Annuler »). */
export function ConfirmDeleteMemberDialog({
  member,
  sponsoredHouseholds,
  onConfirm,
  onCancel
}: ConfirmDeleteMemberDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={member !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        {member && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer {memberDisplayName(member)} ?</AlertDialogTitle>
              <AlertDialogDescription>
                Le fidèle disparaîtra des listes et de la recherche. Les rangs et matricules des
                autres membres du foyer ne changent pas.
                {sponsoredHouseholds.length > 0 &&
                  ` Il parraine les foyers ${householdNumbersLabel(sponsoredHouseholds)} : ils passeront en « Parrain à désigner ».`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onConfirm(member)}>
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
