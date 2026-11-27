import { Eye, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import type { HouseholdSummaryDTO } from '@shared/domain/members/households.types'
import { memberDisplayName } from '@shared/domain/members/members.rules'
import {
  actionsCell,
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
  onDelete: (household: HouseholdSummaryDTO) => void
}

/** Foyers par numéro ; le nom du membre de plus petit rang aide à reconnaître le foyer. */
export function HouseholdsTable({
  households,
  onOpen,
  onDelete
}: HouseholdsTableProps): React.JSX.Element {
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
            <th scope="col" className={`${headCell({ align: 'right' })} ${actionsCell}`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {households.map((h) => (
            <tr key={h.id} className={row}>
              <td className={bodyCell({ numeric: true })}>{h.number}</td>
              <td className={bodyCell()}>
                <button type="button" className={openButton} onClick={() => onOpen(h)}>
                  {h.mainName ?? <span className={missingText}>Aucun membre</span>}
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
              <td className={`${bodyCell({ align: 'right' })} ${actionsCell}`}>
                {/* Ouvrir toujours visible : cliquer sur le nom n'est pas évident (porteur) */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Voir le foyer ${h.number}`}
                  title="Voir le foyer"
                  onClick={() => onOpen(h)}
                >
                  <Eye aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Supprimer le foyer ${h.number}`}
                  title="Supprimer le foyer"
                  onClick={() => onDelete(h)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
