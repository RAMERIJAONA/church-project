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
import { formatBirthDate, memberDisplayName } from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'

export interface DuplicateMemberDialogProps {
  /** Fidèle existant de même nom, prénom et date de naissance ; `null` : fermé */
  existing: MemberDTO | null
  /** Ajout ou modification (libellé du bouton) */
  mode: 'create' | 'edit'
  onConfirm: () => void
  onCancel: () => void
}

/** Doublon probable : avertir sans bloquer (porteur, 2026-11-27). */
export function DuplicateMemberDialog({
  existing,
  mode,
  onConfirm,
  onCancel
}: DuplicateMemberDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={existing !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        {existing && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Ce fidèle existe peut-être déjà</AlertDialogTitle>
              <AlertDialogDescription>
                Un fidèle {memberDisplayName(existing)} né le {formatBirthDate(existing.birthDate)}{' '}
                existe déjà
                {existing.registrationNumber
                  ? ` (matricule ${existing.registrationNumber})`
                  : ''}. {mode === 'create' ? 'Ajouter quand même ?' : 'Enregistrer quand même ?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>
                {mode === 'create' ? 'Ajouter quand même' : 'Enregistrer quand même'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
