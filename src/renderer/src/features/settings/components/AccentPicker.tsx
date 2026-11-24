import { Check } from 'lucide-react'
import { RadioGroup } from 'radix-ui'
import { ACCENTS, type Accent } from '@shared/domain/settings/settings.types'
import { ACCENT_LABELS } from '../settings.utils'
import { accentSwatch } from './accent-picker.styles'

export interface AccentPickerProps {
  value: Accent
  disabled?: boolean
  onValueChange: (value: Accent) => void
}

/** Pastilles de couleur : chaque pastille porte data-accent, tokens.css lui donne sa teinte. */
export function AccentPicker({
  value,
  disabled,
  onValueChange
}: AccentPickerProps): React.JSX.Element {
  return (
    <RadioGroup.Root
      aria-label="Couleur d’accent"
      value={value}
      disabled={disabled}
      orientation="horizontal"
      className="flex items-center gap-3"
      onValueChange={(v) => {
        const accent = ACCENTS.find((a) => a === v)
        if (accent) onValueChange(accent)
      }}
    >
      {ACCENTS.map((accent) => (
        <RadioGroup.Item
          key={accent}
          value={accent}
          data-accent={accent}
          aria-label={ACCENT_LABELS[accent]}
          title={ACCENT_LABELS[accent]}
          className={accentSwatch()}
        >
          <RadioGroup.Indicator>
            <Check className="size-4" aria-hidden />
          </RadioGroup.Indicator>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
