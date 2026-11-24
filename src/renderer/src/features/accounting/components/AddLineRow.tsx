import { Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { nextLineCode } from '@shared/domain/accounting/accounting.rules'
import {
  descriptionSchema,
  type AccountingSectionDTO
} from '@shared/domain/accounting/accounting.types'
import { getMoneyInputProps } from '@renderer/lib/money-input'
import { parseAmount } from '@shared/utils/money'
import { codeCell, sheetRow } from './accounting.styles'
import { useSheetActions } from './sheet-actions'

export interface AddLineRowProps {
  section: AccountingSectionDTO
  open: boolean
}

/**
 * Dernière rangée d'une rubrique : bouton « Ajouter une ligne », ou formulaire de saisie rapide.
 * Le formulaire reste ouvert après chaque ajout (focus sur la description) pour enchaîner.
 */
export function AddLineRow({ section, open }: AddLineRowProps): React.JSX.Element {
  const actions = useSheetActions()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const descriptionRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const code = nextLineCode(section)
  const amountField = getMoneyInputProps(amount, setAmount)

  if (!open) {
    return (
      <tr className={sheetRow({ kind: 'add' })}>
        <td />
        <td colSpan={3} className="px-1 py-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            aria-label={`Ajouter une ligne à ${section.code}`}
            onClick={() => actions.openAddLine(section.id)}
          >
            <Plus aria-hidden />
            Ajouter une ligne
          </Button>
        </td>
      </tr>
    )
  }

  const submit = async (): Promise<void> => {
    const desc = descriptionSchema.safeParse(description)
    if (!desc.success) {
      setError('Saisissez une description.')
      descriptionRef.current?.focus()
      return
    }
    const parsed = parseAmount(amount)
    if (!parsed.ok) {
      setError('Montant invalide : chiffres uniquement, sans décimales.')
      amountRef.current?.focus()
      return
    }
    setBusy(true)
    try {
      await actions.addLine(section.id, desc.data, parsed.value)
      setDescription('')
      setAmount('')
      setError(null)
      descriptionRef.current?.focus()
    } catch {
      // Erreur déjà affichée par la page (toast) ; la saisie est conservée pour réessayer
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') actions.openAddLine(null)
  }

  return (
    <tr className="border-b bg-accent/40">
      <td className={codeCell({ kind: 'line' })}>{code}</td>
      <td className="px-1 py-2">
        <Input
          ref={descriptionRef}
          autoFocus
          aria-label={`Description de la nouvelle ligne ${code}`}
          placeholder="Description (ex. Kitapo iombonana)"
          maxLength={200}
          value={description}
          aria-invalid={error !== null && !descriptionSchema.safeParse(description).success}
          onChange={(e) => setDescription(e.currentTarget.value)}
          onKeyDown={(e) => {
            onKeyDown(e)
            if (e.key === 'Enter') {
              e.preventDefault()
              amountRef.current?.focus()
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
        <Input
          ref={amountRef}
          aria-label={`Montant ${actions.year} de la nouvelle ligne ${code}`}
          placeholder={`Montant ${actions.year}`}
          className="text-right tabular-nums"
          {...amountField}
          onKeyDown={(e) => {
            amountField.onKeyDown(e)
            onKeyDown(e)
            if (e.key === 'Enter') {
              e.preventDefault()
              void submit()
            }
          }}
        />
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
            aria-label="Fermer l’ajout de ligne"
            onClick={() => actions.openAddLine(null)}
          >
            <X aria-hidden />
          </Button>
        </div>
      </td>
    </tr>
  )
}
