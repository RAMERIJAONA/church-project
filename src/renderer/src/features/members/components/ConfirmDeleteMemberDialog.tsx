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

export interface ConfirmDeleteMemberDialogProps {
  member: MemberDTO | null
  onConfirm: (member: MemberDTO) => void
  onCancel: () => void
}

/** Confirmation explicite avant de supprimer un fidèle (focus par défaut sur « Annuler »). */
export function ConfirmDeleteMemberDialog({
  member,
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
                Le fidèle disparaîtra de la liste et de la recherche. Son matricule pourra être
                attribué à un autre fidèle.
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
