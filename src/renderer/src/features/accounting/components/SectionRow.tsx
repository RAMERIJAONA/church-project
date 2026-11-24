import { memo, useState } from 'react'
import type { AccountingSectionDTO } from '@shared/domain/accounting/accounting.types'
import { EditableDescription } from './EditableDescription'
import { RowActions } from './RowActions'
import { codeCell, sheetRow } from './accounting.styles'
import { useSheetActions } from './sheet-actions'

export interface SectionRowProps {
  section: AccountingSectionDTO
  /** Premier / dernier de sa lettre (déplacement impossible au-delà) */
  isFirst: boolean
  isLast: boolean
}

/** Rubrique (parent) : numéro + description, sans montant. */
export const SectionRow = memo(function SectionRow({
  section,
  isFirst,
  isLast
}: SectionRowProps): React.JSX.Element {
  const actions = useSheetActions()
  const [editing, setEditing] = useState(false)
  return (
    <tr className={sheetRow({ kind: 'section' })}>
      <th scope="row" className={codeCell({ kind: 'section' })}>
        {section.code}
      </th>
      <td className="px-1 py-1.5" colSpan={2}>
        <EditableDescription
          kind="section"
          value={section.description}
          label={`Description de ${section.code}`}
          editing={editing}
          onEditingChange={setEditing}
          onSave={(d) => actions.renameSection(section.id, d)}
        />
      </td>
      <td className="px-2">
        <RowActions
          code={section.code}
          isFirst={isFirst}
          isLast={isLast}
          onEdit={() => setEditing(true)}
          onMove={(direction) => actions.moveSection(section.id, direction)}
          onDelete={() => actions.askDeleteSection(section)}
        />
      </td>
    </tr>
  )
})
