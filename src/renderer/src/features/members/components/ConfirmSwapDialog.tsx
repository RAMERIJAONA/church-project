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

export interface ConfirmSwapDialogProps {
  /** Les deux enfants qui échangent leur place ; `null` : fermé */
  pair: { member: MemberDTO; neighbour: MemberDTO } | null
  onConfirm: () => void
  onCancel: () => void
}

/** Échanger deux enfants change leurs deux matricules : confirmation explicite. */
export function ConfirmSwapDialog({
  pair,
  onConfirm,
  onCancel
}: ConfirmSwapDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={pair !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        {pair && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Échanger les places de {memberDisplayName(pair.member)} et{' '}
                {memberDisplayName(pair.neighbour)} ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Leurs matricules vont changer : {pair.member.matricule} et{' '}
                {pair.neighbour.matricule} échangent leur rang.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>Échanger</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
