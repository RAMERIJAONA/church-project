import { FolderPlus } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

export interface AccountingEmptyStateProps {
  onCreate: () => void
}

/** Aucune rubrique : explique la numérotation et propose de commencer. */
export function AccountingEmptyState({ onCreate }: AccountingEmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <FolderPlus className="size-6" aria-hidden />
      </span>
      <div className="max-w-md space-y-1.5">
        <h2 className="font-display text-lg font-semibold">Aucune rubrique pour l’instant</h2>
        <p className="text-sm text-muted-foreground">
          Créez une rubrique (par exemple « A1 ASA IOMBONANA »), puis ajoutez-y des lignes avec leur
          montant. Les lettres (A, B, D…) et les numéros sont attribués automatiquement.
        </p>
      </div>
      <Button onClick={onCreate}>Créer la première rubrique</Button>
    </div>
  )
}
