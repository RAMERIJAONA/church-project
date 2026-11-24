import { Fragment } from 'react'
import type { AccountingItemDTO } from '@shared/domain/accounting/accounting.types'
import { AMOUNT_COLUMNS, columnLabel, flattenTree } from '../accounting.utils'
import { AddChildRow } from './AddChildRow'
import { ItemRow } from './ItemRow'
import { col, headCell } from './accounting.styles'

export interface AccountingSheetProps {
  year: number
  /** Éléments de niveau 1 */
  items: AccountingItemDTO[]
  /** Parent dont le formulaire d'ajout de sous-rubrique est ouvert */
  addingChildTo: number | null
}

/**
 * Tableau N° | Description | Estimation N | Réalisation N | Estimation N+1 | actions.
 * Arbre aplati (profondeur d'abord), description indentée par niveau. Liste non virtualisée :
 * un plan comptable reste bien en dessous de 200 lignes (CLAUDE.md par. 2) ; à revoir s'il dépasse.
 */
export function AccountingSheet({
  year,
  items,
  addingChildTo
}: AccountingSheetProps): React.JSX.Element {
  const rows = flattenTree(items)
  // Le formulaire d'ajout se place après le dernier descendant du parent
  const parentIndex = rows.findIndex((r) => r.item.id === addingChildTo)
  const parent = rows[parentIndex]?.item
  let insertAfter = parentIndex
  while (parent && (rows[insertAfter + 1]?.item.level ?? 0) > parent.level) insertAfter++

  return (
    // overflow-clip : coins arrondis sans créer de conteneur de défilement (l'en-tête reste collant)
    <div className="overflow-clip rounded-xl border bg-card text-sm">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">Comptabilité {year}</caption>
        <colgroup>
          <col className={col.code} />
          <col />
          {AMOUNT_COLUMNS.map((c) => (
            <col key={c} className={col.amount} />
          ))}
          <col className={col.actions} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={headCell()}>
              N°
            </th>
            <th scope="col" className={headCell()}>
              Description
            </th>
            {AMOUNT_COLUMNS.map((c) => (
              <th key={c} scope="col" className={headCell({ align: 'right' })}>
                {columnLabel(year, c)}
              </th>
            ))}
            <th scope="col" className={headCell()}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <Fragment key={row.item.id}>
              <ItemRow item={row.item} isFirst={row.isFirst} isLast={row.isLast} />
              {parent && i === insertAfter && <AddChildRow key="add" parent={parent} />}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
