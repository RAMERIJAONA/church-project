import type { HouseholdDTO } from '@shared/domain/members/households.types'
import { memberDisplayName } from '@shared/domain/members/members.rules'
import { missingText } from './members.styles'

export interface MemberSummaryProps {
  household: HouseholdDTO
  /** Matricule calculé avec la saisie en cours ; `null` tant que le rôle n'est pas choisi */
  matricule: string | null
  /** « 41 ans » ; `null` sans date de naissance valide */
  age: string | null
}

/** En-tête en lecture seule de la fiche : rien ici ne se saisit. */
export function MemberSummary({
  household,
  matricule,
  age
}: MemberSummaryProps): React.JSX.Element {
  const { sector, sponsor } = household
  return (
    <div
      role="group"
      aria-label="Fiche"
      className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg bg-muted/50 px-4 py-3 text-sm sm:grid-cols-3"
    >
      <Item label="Matricule" id="member-matricule">
        <span
          id="member-matricule"
          aria-labelledby="member-matricule-label"
          className="font-semibold tabular-nums"
        >
          {matricule ?? <span className={missingText}>Choisissez un rôle</span>}
        </span>
      </Item>
      <Item label="Foyer">Foyer {household.number}</Item>
      <Item label="Secteur">{`${sector.numeral} · ${sector.name}`}</Item>
      <Item label="Parrain">
        {sponsor ? memberDisplayName(sponsor) : <span className={missingText}>À désigner</span>}
      </Item>
      <Item label="Âge">
        {age ?? <span className={missingText}>Selon la date de naissance</span>}
      </Item>
    </div>
  )
}

function Item({
  label,
  id,
  children
}: {
  label: string
  id?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col">
      <span id={id ? `${id}-label` : undefined} className="text-xs text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}
