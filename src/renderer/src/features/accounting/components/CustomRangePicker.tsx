import { useId } from 'react'
import { DateField } from '@renderer/components/common/DateField'
import type { DateRange } from '@shared/domain/accounting/accounting.periods'

export interface CustomRangePickerProps {
  range: DateRange
  onChange: (range: DateRange) => void
  /** Nom du groupe (lecteur d'écran) */
  label?: string
}

/**
 * Période personnalisée : « Du » et « Au », chacun avec le calendrier en français. Les dates
 * restent dans l'ordre : choisir un début après la fin déplace la fin (et inversement).
 */
export function CustomRangePicker({
  range,
  onChange,
  label = 'Période personnalisée'
}: CustomRangePickerProps): React.JSX.Element {
  // Ids uniques : le détail des saisies a son propre Du / Au, au-dessus de la vue Personnalisé
  const id = useId()
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span id={`${id}-from`} className="text-sm font-medium">
        Du
      </span>
      <DateField
        labelId={`${id}-from`}
        value={range.from}
        onChange={(from) => onChange({ from, to: from > range.to ? from : range.to })}
      />
      <span id={`${id}-to`} className="text-sm font-medium">
        Au
      </span>
      <DateField
        labelId={`${id}-to`}
        value={range.to}
        onChange={(to) => onChange({ from: to < range.from ? to : range.from, to })}
      />
    </div>
  )
}
