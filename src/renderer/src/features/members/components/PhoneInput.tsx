import { Input } from '@renderer/components/ui/input'
import { caretAfterDigits } from '@renderer/lib/money-input'
import { formatPhoneTyping } from '@shared/domain/members/members.rules'

export type PhoneInputProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  value: string
  onValueChange: (formatted: string) => void
}

const countDigits = (text: string): number => text.replace(/\D/g, '').length

/** Téléphone formaté pendant la frappe (« 034 12 345 67 »), curseur conservé. */
export function PhoneInput({ value, onValueChange, ...props }: PhoneInputProps): React.JSX.Element {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="off"
      value={value}
      onChange={(e) => {
        const el = e.currentTarget
        const raw = el.value
        const before = countDigits(raw.slice(0, el.selectionStart ?? raw.length))
        const formatted = formatPhoneTyping(raw)
        if (formatted !== raw) {
          // « 0 » ajouté ou « 261 » retiré en tête : le curseur suit le même chiffre saisi
          const shift = countDigits(formatted) - Math.min(countDigits(raw), 10)
          el.value = formatted
          const caret = caretAfterDigits(formatted, Math.max(0, before + shift))
          el.setSelectionRange(caret, caret)
        }
        onValueChange(formatted)
      }}
    />
  )
}
