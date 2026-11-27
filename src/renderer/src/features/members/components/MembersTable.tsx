import {
  formatBirthDate,
  formatPhone,
  memberDisplayName
} from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'
import { MemberRowActions } from './MemberRowActions'
import {
  addressText,
  bodyCell,
  headCell,
  lastNameText,
  row,
  table,
  tableFrame
} from './members.styles'

export interface MembersTableProps {
  members: MemberDTO[]
  onEdit: (member: MemberDTO) => void
  onDelete: (member: MemberDTO) => void
}

const yesNo = (value: boolean): string => (value ? 'Oui' : 'Non')

/** Liste des fidèles (une page). L'adresse est rappelée en petit sous le nom. */
export function MembersTable({ members, onEdit, onDelete }: MembersTableProps): React.JSX.Element {
  return (
    <div
      role="region"
      aria-label="Liste des fidèles"
      // Zone qui défile : atteignable au clavier (flèches, Page suiv.)
      tabIndex={0}
      className={tableFrame}
    >
      <table className={table}>
        <thead>
          <tr>
            <th scope="col" className={headCell()}>
              Nom
            </th>
            <th scope="col" className={headCell()}>
              Prénom
            </th>
            <th scope="col" className={headCell()}>
              Naissance
            </th>
            <th scope="col" className={headCell()}>
              Téléphone
            </th>
            <th scope="col" className={headCell()}>
              Secteur
            </th>
            <th scope="col" className={headCell({ align: 'center' })}>
              Baptisé
            </th>
            <th scope="col" className={headCell({ align: 'center' })}>
              Communiant
            </th>
            <th scope="col" className={headCell()}>
              Matricule
            </th>
            <th scope="col" className={headCell({ align: 'right' })}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className={row}>
              <td className={bodyCell()}>
                <div className={lastNameText}>{m.lastName}</div>
                <div className={addressText}>{m.address}</div>
              </td>
              <td className={bodyCell()}>{m.firstName}</td>
              <td className={bodyCell({ numeric: true })}>{formatBirthDate(m.birthDate)}</td>
              <td className={bodyCell({ numeric: true })}>{m.phone ? formatPhone(m.phone) : ''}</td>
              <td className={bodyCell()}>{m.sector ?? ''}</td>
              <td className={bodyCell({ align: 'center' })}>{yesNo(m.baptized)}</td>
              <td className={bodyCell({ align: 'center' })}>{yesNo(m.communicant)}</td>
              <td className={bodyCell({ numeric: true })}>{m.registrationNumber ?? ''}</td>
              <td className={bodyCell({ align: 'right' })}>
                <MemberRowActions
                  name={memberDisplayName(m)}
                  onEdit={() => onEdit(m)}
                  onDelete={() => onDelete(m)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
