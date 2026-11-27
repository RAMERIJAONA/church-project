import { CalendarDays } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { localDateOf } from '@shared/domain/accounting/accounting.periods'
import { Calendar } from './Calendar'

export interface DateFieldProps {
  /** Id de l'élément qui nomme le champ (ex. un <Label> « Du ») */
  labelId: string
  /** Date « AAAA-MM-JJ », ou '' tant qu'aucune n'est choisie */
  value: string
  min?: string
  max?: string
  disabled?: boolean
  /** Texte affiché sans date choisie */
  placeholder?: string
  /** Champ en erreur (lu par les lecteurs d'écran) */
  invalid?: boolean
  onChange: (date: string) => void
}

const shortDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' })
const display = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number)
  return shortDate.format(new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)))
}

/** Champ date : bouton « 24 nov. 2026 » qui ouvre un calendrier en français. */
export function DateField({
  labelId,
  value,
  min,
  max,
  disabled,
  placeholder = 'Choisir une date',
  invalid,
  onChange
}: DateFieldProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const valueId = useId()
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          aria-labelledby={`${labelId} ${valueId}`}
          aria-invalid={invalid || undefined}
          className="w-40 justify-start gap-2 font-normal tabular-nums"
        >
          <CalendarDays aria-hidden className="text-muted-foreground" />
          <span id={valueId} className={value === '' ? 'text-muted-foreground' : undefined}>
            {value === '' ? placeholder : display(value)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Choisir une date" role="dialog">
        <Calendar
          value={value}
          today={localDateOf(new Date())}
          min={min}
          max={max}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
