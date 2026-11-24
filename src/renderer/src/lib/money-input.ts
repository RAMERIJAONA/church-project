import { formatAmountTyping } from '@shared/utils/money'

const isDigit = (ch: string): boolean => ch >= '0' && ch <= '9'

/** Position dans `text` juste après son n-ième chiffre (0 → début). */
export function caretAfterDigits(text: string, digits: number): number {
  if (digits <= 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i++) {
    if (isDigit(text.charAt(i)) && ++seen === digits) return i + 1
  }
  return text.length
}

function countDigits(text: string): number {
  let n = 0
  for (const ch of text) if (isDigit(ch)) n++
  return n
}

export interface MoneyInputProps {
  value: string
  inputMode: 'numeric'
  autoComplete: 'off'
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

/**
 * Props d'un champ montant formaté pendant la frappe (« 2 000 000 »), à étaler sur un <input>.
 * - seuls les chiffres sont acceptés, regroupés par 3 à chaque touche ;
 * - le curseur reste après le même chiffre malgré les espaces ajoutées ou retirées ;
 * - Retour arrière / Suppr sur une espace efface le chiffre voisin (sinon on resterait bloqué).
 * Pour ajouter son propre `onKeyDown`, l'appelant appelle d'abord `props.onKeyDown(e)`.
 */
export function getMoneyInputProps(
  value: string,
  onValueChange: (formatted: string) => void
): MoneyInputProps {
  return {
    value,
    inputMode: 'numeric',
    autoComplete: 'off',
    onChange: (e) => {
      const el = e.currentTarget
      const raw = el.value
      const digitsBeforeCaret = countDigits(raw.slice(0, el.selectionStart ?? raw.length))
      const formatted = formatAmountTyping(raw)
      // Valeur et curseur posés tout de suite dans le champ : au rendu, React trouve déjà la bonne
      // valeur et ne la réécrit pas (sinon le curseur sauterait en fin de champ)
      if (formatted !== raw) {
        el.value = formatted
        const caret = caretAfterDigits(formatted, digitsBeforeCaret)
        el.setSelectionRange(caret, caret)
      }
      onValueChange(formatted)
    },
    onKeyDown: (e) => {
      const el = e.currentTarget
      const start = el.selectionStart
      if (start !== null && start === el.selectionEnd) {
        if (e.key === 'Backspace' && start > 0 && !isDigit(el.value.charAt(start - 1))) {
          el.setSelectionRange(start - 1, start - 1)
        } else if (
          e.key === 'Delete' &&
          start < el.value.length &&
          !isDigit(el.value.charAt(start))
        ) {
          el.setSelectionRange(start + 1, start + 1)
        }
      }
    }
  }
}
