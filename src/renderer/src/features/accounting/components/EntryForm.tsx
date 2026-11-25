import { useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { getMoneyInputProps } from '@renderer/lib/money-input'
import { labelSchema } from '@shared/domain/accounting/accounting.types'
import { CURRENCY, formatAmount, parseAmount } from '@shared/utils/money'
import { amountSuffix } from './accounting.styles'

export interface EntryFormProps {
  /** Complète les noms accessibles : « de la nouvelle saisie », « de la saisie Kojakoja » */
  target: string
  initial?: { amount: number; label: string | null }
  submitLabel: string
  disabled: boolean
  /** Rejette en cas d'échec (la saisie est alors conservée) */
  onSubmit: (amount: number, label: string | null) => Promise<void>
  onCancel?: () => void
}

/**
 * Libellé (facultatif) + montant. Entrée enregistre. Sert à l'ajout comme à la modification.
 * Pas de champ date : la date et l'heure sont enregistrées automatiquement (demande du porteur).
 */
export function EntryForm({
  target,
  initial,
  submitLabel,
  disabled,
  onSubmit,
  onCancel
}: EntryFormProps): React.JSX.Element {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [amount, setAmount] = useState(initial ? formatAmount(initial.amount) : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const labelRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const money = getMoneyInputProps(amount, setAmount)

  const submit = async (): Promise<void> => {
    const parsedLabel = labelSchema.safeParse(label)
    if (!parsedLabel.success) {
      setError('Libellé trop long : 120 caractères maximum.')
      labelRef.current?.focus()
      return
    }
    const parsedAmount = parseAmount(amount)
    if (!parsedAmount.ok || parsedAmount.value === null) {
      setError('Saisissez un montant : chiffres uniquement, sans décimales.')
      amountRef.current?.focus()
      return
    }
    setBusy(true)
    try {
      await onSubmit(parsedAmount.value, parsedLabel.data)
      setError(null)
      if (!initial) {
        setLabel('')
        setAmount('')
        labelRef.current?.focus()
      }
    } catch {
      // Erreur déjà affichée par la page (toast) ; la saisie est conservée pour réessayer
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void submit()
    } else if (e.key === 'Escape' && onCancel) {
      e.stopPropagation() // ne ferme pas le panneau, seulement l'édition
      onCancel()
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Input
          ref={labelRef}
          aria-label={`Libellé ${target}`}
          placeholder="Libellé (facultatif)"
          maxLength={120}
          autoComplete="off"
          className="flex-1"
          value={label}
          disabled={disabled}
          onChange={(e) => setLabel(e.currentTarget.value)}
          onKeyDown={onKeyDown}
        />
        <div className="relative w-40">
          <Input
            ref={amountRef}
            aria-label={`Montant ${target}`}
            placeholder="Montant"
            className="pr-8 text-right tabular-nums"
            disabled={disabled}
            aria-invalid={error !== null ? true : undefined}
            {...money}
            onKeyDown={(e) => {
              money.onKeyDown(e)
              onKeyDown(e)
            }}
          />
          <span aria-hidden className={amountSuffix}>
            {CURRENCY}
          </span>
        </div>
        <Button disabled={disabled || busy} onClick={() => void submit()}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
