import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ROLE_LABELS } from '@shared/domain/members/households.rules'
import type { SponsorDTO } from '@shared/domain/members/households.types'
import {
  ageOn,
  formatAge,
  formatBirthDate,
  formatPhone,
  memberDisplayName
} from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'
import {
  bodyCell,
  headCell,
  matriculeText,
  missingText,
  openButton,
  row,
  table,
  tableFrame
} from './members.styles'

export interface HouseholdMembersTableProps {
  /** Membres actifs du foyer, par rang */
  members: MemberDTO[]
  sponsor: SponsorDTO | null
  /** « AAAA-MM-JJ » : calcul de l'âge */
  today: string
  onOpen: (member: MemberDTO) => void
  onDelete: (member: MemberDTO) => void
  onSwap: (member: MemberDTO, direction: 'up' | 'down') => void
}

const COLUMNS = [
  'Matricule',
  'Rôle',
  'Nom',
  'Prénom',
  'Naissance',
  'Âge',
  'Téléphone',
  'Adresse',
  'Secteur',
  'Parrain'
]

/** Membres d'un foyer, par rang : Modifier, ↑ ↓ (enfants), Supprimer visibles sur chaque ligne. */
export function HouseholdMembersTable(p: HouseholdMembersTableProps): React.JSX.Element {
  const children = p.members.filter((m) => m.role === 'child')
  return (
    <div role="region" aria-label="Membres du foyer" tabIndex={0} className={tableFrame}>
      <table className={`${table} min-w-[72rem]`}>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className={headCell()}>
                {c}
              </th>
            ))}
            <th scope="col" className={headCell({ align: 'right' })}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {p.members.map((m) => {
            const name = memberDisplayName(m)
            const childIndex = children.indexOf(m)
            return (
              <tr key={m.id} className={row}>
                <td className={bodyCell()}>
                  <span className={matriculeText}>{m.matricule}</span>
                </td>
                <td className={bodyCell()}>{ROLE_LABELS[m.role]}</td>
                <td className={bodyCell()}>
                  <button
                    type="button"
                    className={openButton}
                    aria-label={name}
                    onClick={() => p.onOpen(m)}
                  >
                    {m.lastName}
                  </button>
                </td>
                <td className={bodyCell()}>{m.firstName}</td>
                <td className={bodyCell({ numeric: true })}>{formatBirthDate(m.birthDate)}</td>
                <td className={bodyCell({ numeric: true })}>
                  {formatAge(ageOn(m.birthDate, p.today))}
                </td>
                <td className={bodyCell({ numeric: true })}>
                  {m.phone ? formatPhone(m.phone) : ''}
                </td>
                <td className={bodyCell()}>{m.address}</td>
                <td className={bodyCell({ numeric: true })}>{m.sector.numeral}</td>
                <td className={bodyCell()}>
                  {p.sponsor ? (
                    memberDisplayName(p.sponsor)
                  ) : (
                    <span className={missingText}>À désigner</span>
                  )}
                </td>
                <td className={bodyCell({ align: 'right' })}>
                  <div className="flex items-center justify-end gap-0.5">
                    {/* Modifier toujours visible : cliquer sur le nom n'est pas évident (porteur) */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Modifier ${name}`}
                      title="Modifier"
                      onClick={() => p.onOpen(m)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    {childIndex > 0 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Monter ${name}`}
                        title="Monter"
                        onClick={() => p.onSwap(m, 'up')}
                      >
                        <ArrowUp aria-hidden />
                      </Button>
                    )}
                    {childIndex >= 0 && childIndex < children.length - 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Descendre ${name}`}
                        title="Descendre"
                        onClick={() => p.onSwap(m, 'down')}
                      >
                        <ArrowDown aria-hidden />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Supprimer ${name}`}
                      title="Supprimer"
                      onClick={() => p.onDelete(m)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
