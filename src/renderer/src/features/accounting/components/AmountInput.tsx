import { useRef, useState } from 'react'
import { getMoneyInputProps } from '@renderer/lib/money-input'
import { formatAmount, parseAmount } from '@shared/utils/money'
import { amountInput } from './accounting.styles'

export interface AmountInputProps {
  value: number | null
  label: string
  onCommit: (amount: number | null) => void
  disabled?: boolean
}

/** Passe le focus à la case montant suivante du tableau (comme un tableur). */
function focusNextAmount(current: HTMLInputElement): void {
  const scope = current.closest('table') ?? document
  const inputs = Array.from(scope.querySelectorAll<HTMLInputElement>('input[data-amount]'))
  const next = inputs[inputs.indexOf(current) + 1]
  if (next) {
    next.focus()
    next.select()
  } else current.blur()
}

/**
 * Case montant éditable en place, toujours affichée « 2 000 000 » (y compris pendant la frappe).
 * Entrée : enregistre et passe à la ligne suivante. Échap : annule. Sortie de la case : enregistre.
 */
export function AmountInput({
  value,
  label,
  onCommit,
  disabled
}: AmountInputProps): React.JSX.Element {
  // draft = null : pas en cours d'édition, on affiche la valeur reçue
  const [draft, setDraft] = useState<string | null>(null)
  // Le blur provoqué par Entrée/Échap ne doit pas ré-enregistrer (closure encore sur l'ancien draft)
  const skipBlur = useRef(false)
  const text = draft ?? (value === null ? '' : formatAmount(value))

  /** Vrai si la saisie est valide (enregistrée si elle a changé). */
  const commit = (): boolean => {
    if (draft === null) return true
    const parsed = parseAmount(draft)
    if (!parsed.ok) return false
    if (parsed.value !== value) onCommit(parsed.value)
    setDraft(null)
    return true
  }

  const leave = (input: HTMLInputElement, move: (el: HTMLInputElement) => void): void => {
    skipBlur.current = true
    move(input)
    skipBlur.current = false
  }

  const money = getMoneyInputProps(text, setDraft)

  return (
    <input
      data-amount
      type="text"
      aria-label={label}
      disabled={disabled}
      className={amountInput()}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => {
        if (!skipBlur.current) commit()
      }}
      {...money}
      onKeyDown={(e) => {
        money.onKeyDown(e)
        if (e.key === 'Enter') {
          e.preventDefault()
          if (commit()) leave(e.currentTarget, focusNextAmount)
        } else if (e.key === 'Escape') {
          setDraft(null)
          leave(e.currentTarget, (el) => el.blur())
        }
      }}
    />
  )
}
