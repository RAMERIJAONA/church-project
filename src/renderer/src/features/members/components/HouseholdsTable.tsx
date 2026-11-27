import type { HouseholdSummaryDTO } from '@shared/domain/members/households.types'
import { memberDisplayName } from '@shared/domain/members/members.rules'
import {
  bodyCell,
  headCell,
  missingText,
  openButton,
  row,
  table,
  tableFrame
} from './members.styles'

export interface HouseholdsTableProps {
  households: HouseholdSummaryDTO[]
  onOpen: (household: HouseholdSummaryDTO) => void
}

/** Foyers par numéro ; le nom du membre de plus petit rang aide à reconnaître le foyer. */
export function HouseholdsTable({ households, onOpen }: HouseholdsTableProps): React.JSX.Element {
  return (
    <div role="region" aria-label="Liste des foyers" tabIndex={0} className={tableFrame}>
      <table className={`${table} min-w-[40rem]`}>
        <thead>
          <tr>
            <th scope="col" className={headCell()}>
              N°
            </th>
            <th scope="col" className={headCell()}>
              Foyer
            </th>
            <th scope="col" className={headCell()}>
              Secteur
            </th>
            <th scope="col" className={headCell()}>
              Parrain
            </th>
            <th scope="col" className={headCell({ align: 'right' })}>
              Membres
            </th>
          </tr>
        </thead>
        <tbody>
          {households.map((h) => (
            <tr key={h.id} className={row}>
              <td className={bodyCell({ numeric: true })}>{h.number}</td>
              <td className={bodyCell()}>
                <button
                  type="button"
                  className={openButton}
                  aria-label={`Ouvrir le foyer ${h.number}`}
                  onClick={() => onOpen(h)}
                >
                  {h.mainLastName ?? <span className={missingText}>Aucun membre</span>}
                </button>
              </td>
              <td className={bodyCell()}>{`${h.sector.numeral} · ${h.sector.name}`}</td>
              <td className={bodyCell()}>
                {h.sponsor ? (
                  memberDisplayName(h.sponsor)
                ) : (
                  <span className={missingText}>Parrain à désigner</span>
                )}
              </td>
              <td className={bodyCell({ align: 'right', numeric: true })}>{h.memberCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
