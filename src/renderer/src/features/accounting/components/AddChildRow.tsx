import { X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  descriptionSchema,
  type AccountingItemDTO
} from '@shared/domain/accounting/accounting.types'
import { codeCell, descriptionCell, sheetRow } from './accounting.styles'
import { useSheetActions } from './sheet-actions'

export interface AddChildRowProps {
  /** Parent qui reçoit la sous-rubrique (niveau 1 à 3) */
  parent: AccountingItemDTO
  /** Numéro qu'aura la nouvelle sous-rubrique (`nextChildCode`) */
  code: string
}

/**
 * Saisie rapide d'une sous-rubrique, affichée après le dernier descendant du parent. Reste
 * ouverte après chaque ajout (focus sur la description) pour enchaîner ; Échap ferme.
 * Les montants se saisissent ensuite dans le tableau.
 */
export function AddChildRow({ parent, code }: AddChildRowProps): React.JSX.Element {
  const actions = useSheetActions()
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const level = (parent.level + 1) as 2 | 3 | 4

  const submit = async (): Promise<void> => {
    const parsed = descriptionSchema.safeParse(description)
    if (!parsed.success) {
      setError('Saisissez une description.')
      inputRef.current?.focus()
      return
    }
    setBusy(true)
    try {
      await actions.addChild(parent.id, parsed.data)
      setDescription('')
      setError(null)
      inputRef.current?.focus()
    } catch {
      // Erreur déjà affichée par la page (toast) ; la saisie est conservée pour réessayer
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr data-print="hide" className={sheetRow({ kind: 'add' })}>
      <td className={codeCell({ kind: 'leaf' })}>{code}</td>
      <td className={descriptionCell({ level })} colSpan={4}>
        <Input
          ref={inputRef}
          autoFocus
          aria-label={`Description de la nouvelle sous-rubrique ${code}`}
          placeholder="Description (ex. Mpitandrina)"
          maxLength={200}
          value={description}
          aria-invalid={error !== null ? true : undefined}
          onChange={(e) => setDescription(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') actions.openAddChild(null)
            if (e.key === 'Enter') {
              e.preventDefault()
              void submit()
            }
          }}
        />
        {error && (
          <p role="alert" className="mt-1 px-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </td>
      <td className="px-2 py-2 align-top">
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" disabled={busy} onClick={() => void submit()}>
            Ajouter
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Fermer"
            aria-label="Fermer l’ajout de sous-rubrique"
            onClick={() => actions.openAddChild(null)}
          >
            <X aria-hidden />
          </Button>
        </div>
      </td>
    </tr>
  )
}
