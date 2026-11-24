import { useId, useRef, useState } from 'react'
import { DateField } from '@renderer/components/common/DateField'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { getMoneyInputProps } from '@renderer/lib/money-input'
import { labelSchema } from '@shared/domain/accounting/accounting.types'
import { formatAmount, parseAmount } from '@shared/utils/money'

/** Bornes et valeur proposée du champ date (réalisations seulement). */
export interface OperationDateBounds {
  min: string
  max: string
  initial: string
}

export interface EntryFormProps {
  /** Complète les noms accessibles : « de la nouvelle saisie », « de la saisie Kojakoja » */
  target: string
  initial?: { amount: number; label: string | null; operatedOn: string | null }
  /** Réalisation : champ date d'opération ; `null` pour une estimation (pas de date) */
  dates: OperationDateBounds | null
  submitLabel: string
  disabled: boolean
  /** Rejette en cas d'échec (la saisie est alors conservée) */
  onSubmit: (amount: number, label: string | null, operatedOn: string | null) => Promise<void>
  onCancel?: () => void
}

/** Libellé (facultatif) + montant. Entrée enregistre. Sert à l'ajout comme à la modification. */
export function EntryForm({
  target,
  initial,
  dates,
  submitLabel,
  disabled,
  onSubmit,
  onCancel
}: EntryFormProps): React.JSX.Element {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [amount, setAmount] = useState(initial ? formatAmount(initial.amount) : '')
  const dateLabelId = useId()
  const [operatedOn, setOperatedOn] = useState(initial?.operatedOn ?? dates?.initial ?? '')
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
    if (dates && !(operatedOn >= dates.min && operatedOn <= dates.max)) {
      setError(`Choisissez une date entre le ${dates.min} et le ${dates.max}.`)
      return
    }
    setBusy(true)
    try {
      await onSubmit(parsedAmount.value, parsedLabel.data, dates ? operatedOn : null)
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
        {dates && (
          <>
            <span id={dateLabelId} className="sr-only">
              Date {target}
            </span>
            <DateField
              labelId={dateLabelId}
              value={operatedOn}
              min={dates.min}
              max={dates.max}
              disabled={disabled}
              onChange={setOperatedOn}
            />
          </>
        )}
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
        <Input
          ref={amountRef}
          aria-label={`Montant ${target}`}
          placeholder="Montant"
          className="w-36 text-right tabular-nums"
          disabled={disabled}
          aria-invalid={error !== null ? true : undefined}
          {...money}
          onKeyDown={(e) => {
            money.onKeyDown(e)
            onKeyDown(e)
          }}
        />
        <Button size="sm" disabled={disabled || busy} onClick={() => void submit()}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
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
