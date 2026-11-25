import { CornerDownRight } from 'lucide-react'
import { memo, useState } from 'react'
import {
  MAX_DEPTH,
  MAX_YEAR,
  type AccountingItemDTO
} from '@shared/domain/accounting/accounting.types'
import { AMOUNT_COLUMNS, columnLabel, columnTarget, type ColumnTotals } from '../accounting.utils'
import { AmountCell } from './AmountCell'
import { EditableDescription } from './EditableDescription'
import { RowActions } from './RowActions'
import { SubtotalCell } from './SubtotalCell'
import { codeCell, descriptionCell, sheetRow, treeConnector } from './accounting.styles'
import { useSheetActions } from './sheet-actions'

export interface ItemRowProps {
  item: AccountingItemDTO
  /** Groupe : somme de sa descendance, par colonne (lecture seule) */
  subtotals?: ColumnTotals
}

function addChildBlockedReason(item: AccountingItemDTO): string | null {
  if (item.level >= MAX_DEPTH) return 'Dernier niveau : pas de sous-rubrique possible'
  if (!item.canAddChild)
    return 'Cette rubrique a des montants : videz-les avant d’ajouter une sous-rubrique'
  return null
}

/** Une rangée du tableau : numéro, description indentée selon le niveau, 3 montants, actions. */
export const ItemRow = memo(function ItemRow({ item, subtotals }: ItemRowProps): React.JSX.Element {
  const actions = useSheetActions()
  const [editing, setEditing] = useState(false)
  const kind = item.level === 1 ? 'root' : item.amounts === null ? 'group' : 'leaf'
  const amounts = item.amounts
  return (
    <tr data-row={kind} className={sheetRow({ kind })}>
      <th scope="row" className={codeCell({ kind, level: item.level })}>
        {item.code}
      </th>
      <td className={descriptionCell({ level: item.level })}>
        <div className="flex items-center gap-1">
          {item.level > 1 && (
            <CornerDownRight aria-hidden data-print="hide" className={treeConnector} />
          )}
          <EditableDescription
            kind={kind === 'root' ? 'section' : kind === 'group' ? 'group' : 'line'}
            value={item.description}
            label={`Description de ${item.code}`}
            editing={editing}
            onEditingChange={setEditing}
            onSave={(d) => actions.rename(item.id, d)}
          />
        </div>
      </td>
      {!amounts &&
        AMOUNT_COLUMNS.map((col) => (
          <SubtotalCell
            key={col}
            value={subtotals?.[col] ?? null}
            title="Sous-total (somme des sous-rubriques)"
          />
        ))}
      {amounts &&
        AMOUNT_COLUMNS.map((col) => (
          <AmountCell
            key={col}
            cell={amounts[col]}
            label={`${columnLabel(actions.year, col)} de ${item.code}`}
            year={columnTarget(actions.year, col).year}
            disabled={columnTarget(actions.year, col).year > MAX_YEAR}
            onCommit={(amount) => actions.setTotal(item.id, col, amount)}
            onOpenDetail={() => actions.openDetail(item, col)}
          />
        ))}
      <td data-print="hide" className="px-2">
        <RowActions
          code={item.code}
          addChildBlockedReason={addChildBlockedReason(item)}
          onAddChild={() => actions.openAddChild(item.id)}
          onEdit={() => setEditing(true)}
          onDelete={() => actions.askDelete(item)}
        />
      </td>
    </tr>
  )
})
