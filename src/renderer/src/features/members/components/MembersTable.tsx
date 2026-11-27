import { Pencil } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { formatPhone, memberDisplayName } from '@shared/domain/members/members.rules'
import type { MemberDTO, MemberSort } from '@shared/domain/members/members.types'
import { BirthCell, PersonCell } from './MemberCells'
import { MemberRowActions } from './MemberRowActions'
import {
  actionsCell,
  bodyCell,
  headCell,
  matriculeText,
  missingText,
  openButton,
  row,
  table,
  tableFrame
} from './members.styles'
import { SortableHeader } from './SortableHeader'

export interface MembersTableProps {
  members: MemberDTO[]
  /** « AAAA-MM-JJ » : calcul de l'âge */
  today: string
  sort: MemberSort
  order: 'asc' | 'desc'
  onSort: (sort: MemberSort) => void
  onEdit: (member: MemberDTO) => void
  onOpenHousehold: (member: MemberDTO) => void
  onDelete: (member: MemberDTO) => void
}

/**
 * Liste globale des fidèles (une page), tous foyers confondus : 7 colonnes regroupées (nom et
 * adresse, date et âge) pour tenir sans défilement horizontal (porteur, 2026-11-27).
 */
export function MembersTable(p: MembersTableProps): React.JSX.Element {
  const sortable = (label: string, sortKey: MemberSort): React.JSX.Element => (
    <SortableHeader
      label={label}
      sortKey={sortKey}
      sort={p.sort}
      order={p.order}
      onSort={p.onSort}
    />
  )
  const plain = (label: string): React.JSX.Element => (
    <th scope="col" className={headCell()}>
      {label}
    </th>
  )
  return (
    <div
      role="region"
      aria-label="Liste des fidèles"
      // Zone qui défile : atteignable au clavier (flèches, Page suiv.)
      tabIndex={0}
      className={tableFrame}
    >
      <table className={`${table} min-w-[46rem]`}>
        <thead>
          <tr>
            {sortable('Matricule', 'matricule')}
            {sortable('Fidèle', 'name')}
            {sortable('Naissance', 'birthDate')}
            {plain('Téléphone')}
            {sortable('Secteur', 'sector')}
            {plain('Parrain')}
            {sortable('Foyer', 'household')}
            <th scope="col" className={`${headCell({ align: 'right' })} ${actionsCell}`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {p.members.map((m) => (
            <tr key={m.id} className={row}>
              <td className={bodyCell()}>
                <span className={matriculeText}>{m.matricule}</span>
              </td>
              <td className={bodyCell()}>
                <PersonCell member={m} showDeacon onOpen={() => p.onEdit(m)} />
              </td>
              <td className={bodyCell()}>
                <BirthCell birthDate={m.birthDate} today={p.today} />
              </td>
              <td className={bodyCell({ numeric: true })}>{m.phone ? formatPhone(m.phone) : ''}</td>
              <td className={bodyCell()}>{`${m.sector.numeral} · ${m.sector.name}`}</td>
              <td className={bodyCell()}>
                {m.sponsor ? (
                  memberDisplayName(m.sponsor)
                ) : (
                  <span className={missingText}>À désigner</span>
                )}
              </td>
              <td className={bodyCell({ numeric: true })}>
                <button type="button" className={openButton} onClick={() => p.onOpenHousehold(m)}>
                  Foyer {m.householdNumber}
                </button>
              </td>
              <td className={`${bodyCell({ align: 'right' })} ${actionsCell}`}>
                <div className="flex items-center justify-end gap-0.5">
                  {/* Modifier toujours visible : cliquer sur le nom n'est pas évident (porteur) */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Modifier ${memberDisplayName(m)}`}
                    title="Modifier"
                    onClick={() => p.onEdit(m)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <MemberRowActions
                    name={memberDisplayName(m)}
                    onOpenHousehold={() => p.onOpenHousehold(m)}
                    onDelete={() => p.onDelete(m)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
