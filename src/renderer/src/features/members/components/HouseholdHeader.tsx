import { ArrowLeft, Pencil, Trash2, UserPlus } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@renderer/components/ui/button'
import type { HouseholdDTO } from '@shared/domain/members/households.types'
import { memberDisplayName } from '@shared/domain/members/members.rules'
import { missingText } from './members.styles'

export interface HouseholdHeaderProps {
  household: HouseholdDTO
  onEdit: () => void
  onAddMember: () => void
  /** Supprime le foyer et ses membres, après confirmation */
  onDelete: () => void
}

/** En-tête de la page d'un foyer : numéro, secteur, parrain, actions. */
export function HouseholdHeader({
  household,
  onEdit,
  onAddMember,
  onDelete
}: HouseholdHeaderProps): React.JSX.Element {
  const { sector, sponsor } = household
  return (
    <div className="flex shrink-0 flex-col gap-3">
      <Link
        to="/foyers"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Retour aux foyers
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Foyer {household.number}</h2>
          <p className="text-sm text-muted-foreground">
            Secteur {sector.numeral} · {sector.name} · Parrain :{' '}
            {sponsor ? (
              <span className="text-foreground">{memberDisplayName(sponsor)}</span>
            ) : (
              <span className={missingText}>à désigner</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Pencil aria-hidden />
            Modifier le foyer
          </Button>
          <Button variant="outline" onClick={onDelete}>
            <Trash2 aria-hidden />
            Supprimer le foyer
          </Button>
          <Button onClick={onAddMember}>
            <UserPlus aria-hidden />
            Ajouter un membre
          </Button>
        </div>
      </div>
    </div>
  )
}
