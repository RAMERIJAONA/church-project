import { Pencil } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import type { SectorDTO } from '@shared/domain/members/sectors.types'
import { actionsCell, bodyCell, headCell, row, table, tableFrame } from './members.styles'

export interface SectorsTableProps {
  sectors: SectorDTO[]
  onRename: (sector: SectorDTO) => void
}

/** Secteurs par numéro de création (I, II, III…). */
export function SectorsTable({ sectors, onRename }: SectorsTableProps): React.JSX.Element {
  return (
    <div role="region" aria-label="Liste des secteurs" tabIndex={0} className={tableFrame}>
      <table className={`${table} min-w-0`}>
        <thead>
          <tr>
            <th scope="col" className={headCell()}>
              Numéro
            </th>
            <th scope="col" className={headCell()}>
              Nom
            </th>
            <th scope="col" className={headCell({ align: 'right' })}>
              Foyers
            </th>
            <th scope="col" className={headCell({ align: 'right' })}>
              Fidèles
            </th>
            <th scope="col" className={`${headCell({ align: 'right' })} ${actionsCell}`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sectors.map((s) => (
            <tr key={s.id} className={row}>
              <td className={bodyCell({ numeric: true })}>{s.numeral}</td>
              <td className={bodyCell({ nowrap: true })}>{s.name}</td>
              <td className={bodyCell({ align: 'right', numeric: true })}>{s.householdCount}</td>
              <td className={bodyCell({ align: 'right', numeric: true })}>{s.memberCount}</td>
              <td className={`${bodyCell({ align: 'right' })} ${actionsCell}`}>
                <Button
                  variant="ghost"
                  aria-label={`Renommer ${s.name}`}
                  onClick={() => onRename(s)}
                >
                  <Pencil aria-hidden />
                  Renommer
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
