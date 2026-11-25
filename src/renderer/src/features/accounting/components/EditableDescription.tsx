import { descriptionSchema } from '@shared/domain/accounting/accounting.types'
import { DescriptionField } from './DescriptionField'
import { editableText } from './accounting.styles'

export interface EditableDescriptionProps {
  value: string
  /** Nom accessible du champ en édition, ex. « Description de F1-I-1 » */
  label: string
  editing: boolean
  onEditingChange: (editing: boolean) => void
  onSave: (description: string) => void
  /** section = niveau 1 (majuscules), group = sous-rubrique qui a des enfants */
  kind?: 'section' | 'group' | 'line'
}

/** Niveau 1 : majuscules à l'affichage pendant la saisie et à l'envoi (le service le garantit aussi). */
const upperDescriptionSchema = descriptionSchema.toUpperCase()

/** Description modifiable en place : clic sur le texte (ou bouton « Modifier ») → champ. */
export function EditableDescription({
  value,
  label,
  editing,
  onEditingChange,
  onSave,
  kind = 'line'
}: EditableDescriptionProps): React.JSX.Element {
  if (editing) {
    return (
      <DescriptionField
        initialValue={value}
        label={label}
        // Rubrique : toujours en majuscules (enregistrement ET affichage pendant la saisie)
        schema={kind === 'section' ? upperDescriptionSchema : undefined}
        className={kind === 'section' ? 'uppercase' : undefined}
        onDone={(description) => {
          if (description !== null) onSave(description)
          onEditingChange(false)
        }}
      />
    )
  }
  return (
    <button
      type="button"
      className={editableText({ kind })}
      title={`${value} (cliquer pour modifier)`}
      onClick={() => onEditingChange(true)}
    >
      {value}
    </button>
  )
}
