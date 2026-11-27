import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ROLE_LABELS } from '@shared/domain/members/households.rules'
import { formatPhone, memberDisplayName } from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'
import { BirthCell, PersonCell } from './MemberCells'
import {
  actionsCell,
  bodyCell,
  headCell,
  matriculeText,
  row,
  table,
  tableFrame
} from './members.styles'

export interface HouseholdMembersTableProps {
  /** Membres actifs du foyer, par rang */
  members: MemberDTO[]
  /** « AAAA-MM-JJ » : calcul de l'âge */
  today: string
  onOpen: (member: MemberDTO) => void
  onDelete: (member: MemberDTO) => void
  onSwap: (member: MemberDTO, direction: 'up' | 'down') => void
}

/** Secteur et parrain, communs à tout le foyer, sont dans l'en-tête de la page */
const COLUMNS = ['Matricule', 'Rôle', 'Fidèle', 'Naissance', 'Téléphone']

/** Membres d'un foyer, par rang : Modifier, ↑ ↓ (enfants), Supprimer visibles sur chaque ligne. */
export function HouseholdMembersTable(p: HouseholdMembersTableProps): React.JSX.Element {
  const children = p.members.filter((m) => m.role === 'child')
  return (
    <div role="region" aria-label="Membres du foyer" tabIndex={0} className={tableFrame}>
      <table className={`${table} min-w-[36rem]`}>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className={headCell()}>
                {c}
              </th>
            ))}
            <th scope="col" className={`${headCell({ align: 'right' })} ${actionsCell}`}>
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
                  <PersonCell member={m} showDeacon={false} onOpen={() => p.onOpen(m)} />
                </td>
                <td className={bodyCell()}>
                  <BirthCell birthDate={m.birthDate} today={p.today} />
                </td>
                <td className={bodyCell({ numeric: true })}>
                  {m.phone ? formatPhone(m.phone) : ''}
                </td>
                <td className={`${bodyCell({ align: 'right' })} ${actionsCell}`}>
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
