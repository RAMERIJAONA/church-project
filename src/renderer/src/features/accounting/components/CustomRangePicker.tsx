import { DateField } from '@renderer/components/common/DateField'
import type { DateRange } from '@shared/domain/accounting/accounting.periods'

export interface CustomRangePickerProps {
  range: DateRange
  onChange: (range: DateRange) => void
}

/**
 * Période personnalisée : « Du » et « Au », chacun avec le calendrier en français. Les dates
 * restent dans l'ordre : choisir un début après la fin déplace la fin (et inversement).
 */
export function CustomRangePicker({ range, onChange }: CustomRangePickerProps): React.JSX.Element {
  return (
    <div role="group" aria-label="Période personnalisée" className="flex items-center gap-2">
      <span id="range-from-label" className="text-sm font-medium">
        Du
      </span>
      <DateField
        labelId="range-from-label"
        value={range.from}
        onChange={(from) => onChange({ from, to: from > range.to ? from : range.to })}
      />
      <span id="range-to-label" className="text-sm font-medium">
        Au
      </span>
      <DateField
        labelId="range-to-label"
        value={range.to}
        onChange={(to) => onChange({ from: to < range.from ? to : range.from, to })}
      />
    </div>
  )
}
