import { memo, useState } from 'react'
import {
  MAX_DEPTH,
  MAX_YEAR,
  type AccountingItemDTO
} from '@shared/domain/accounting/accounting.types'
import { formatAmount } from '@shared/utils/money'
import { AMOUNT_COLUMNS, columnLabel, columnTarget, type ColumnTotals } from '../accounting.utils'
import { AmountCell } from './AmountCell'
import { EditableDescription } from './EditableDescription'
import { RowActions } from './RowActions'
import { codeCell, descriptionCell, sheetRow, totalCell } from './accounting.styles'
import { useSheetActions } from './sheet-actions'

export interface ItemRowProps {
  item: AccountingItemDTO
  /** Premier / dernier parmi ses frères (déplacement impossible au-delà) */
  isFirst: boolean
  isLast: boolean
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
export const ItemRow = memo(function ItemRow({
  item,
  isFirst,
  isLast,
  subtotals
}: ItemRowProps): React.JSX.Element {
  const actions = useSheetActions()
  const [editing, setEditing] = useState(false)
  const kind = item.level === 1 ? 'root' : item.amounts === null ? 'group' : 'leaf'
  const amounts = item.amounts
  return (
    <tr className={sheetRow({ kind })}>
      <th scope="row" className={codeCell({ kind })}>
        {item.code}
      </th>
      <td className={descriptionCell({ level: item.level })}>
        <EditableDescription
          kind={kind === 'root' ? 'section' : kind === 'group' ? 'group' : 'line'}
          value={item.description}
          label={`Description de ${item.code}`}
          editing={editing}
          onEditingChange={setEditing}
          onSave={(d) => actions.rename(item.id, d)}
        />
      </td>
      {!amounts &&
        AMOUNT_COLUMNS.map((col) => {
          const value = subtotals?.[col] ?? null
          return (
            <td key={col} className={totalCell} title="Sous-total (somme des sous-rubriques)">
              {value === null ? '' : formatAmount(value)}
            </td>
          )
        })}
      {amounts &&
        AMOUNT_COLUMNS.map((col) => (
          <AmountCell
            key={col}
            cell={amounts[col]}
            label={`${columnLabel(actions.year, col)} de ${item.code}`}
            disabled={columnTarget(actions.year, col).year > MAX_YEAR}
            onCommit={(amount) => actions.setTotal(item.id, col, amount)}
            onOpenDetail={() => actions.openDetail(item, col)}
          />
        ))}
      <td className="px-2">
        <RowActions
          code={item.code}
          addChildBlockedReason={addChildBlockedReason(item)}
          onAddChild={() => actions.openAddChild(item.id)}
          isFirst={isFirst}
          isLast={isLast}
          onEdit={() => setEditing(true)}
          onMove={(direction) => actions.move(item.id, direction)}
          onDelete={() => actions.askDelete(item)}
        />
      </td>
    </tr>
  )
})
