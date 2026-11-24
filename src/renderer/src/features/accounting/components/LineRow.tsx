import { memo, useState } from 'react'
import type { AccountingLineDTO } from '@shared/domain/accounting/accounting.types'
import { AmountInput } from './AmountInput'
import { EditableDescription } from './EditableDescription'
import { RowActions } from './RowActions'
import { codeCell, sheetRow } from './accounting.styles'
import { useSheetActions } from './sheet-actions'

export interface LineRowProps {
  line: AccountingLineDTO
  isFirst: boolean
  isLast: boolean
}

/** Ligne (enfant) : numéro, description et montant de l'année affichée. */
export const LineRow = memo(function LineRow({
  line,
  isFirst,
  isLast
}: LineRowProps): React.JSX.Element {
  const actions = useSheetActions()
  const [editing, setEditing] = useState(false)
  return (
    <tr className={sheetRow({ kind: 'line' })}>
      <th scope="row" className={codeCell({ kind: 'line' })}>
        {line.code}
      </th>
      <td className="px-1 py-1">
        <EditableDescription
          value={line.description}
          label={`Description de ${line.code}`}
          editing={editing}
          onEditingChange={setEditing}
          onSave={(d) => actions.renameLine(line.id, d)}
        />
      </td>
      <td className="px-2 py-1">
        <AmountInput
          value={line.amount}
          label={`Montant ${actions.year} de ${line.code}`}
          onCommit={(amount) => actions.setAmount(line.id, amount)}
        />
      </td>
      <td className="px-2">
        <RowActions
          code={line.code}
          isFirst={isFirst}
          isLast={isLast}
          onEdit={() => setEditing(true)}
          onMove={(direction) => actions.moveLine(line.id, direction)}
          onDelete={() => actions.askDeleteLine(line)}
        />
      </td>
    </tr>
  )
})
