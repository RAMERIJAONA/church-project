import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { isCalendarDate, type DateRange } from '@shared/domain/accounting/accounting.periods'

export interface CustomRangePickerProps {
  range: DateRange
  onChange: (range: DateRange) => void
}

/**
 * Période personnalisée : « Du » et « Au » avec le calendrier natif de Chromium (aucune
 * dépendance). Les dates restent dans l'ordre : choisir un début après la fin déplace la fin.
 */
export function CustomRangePicker({ range, onChange }: CustomRangePickerProps): React.JSX.Element {
  const change = (bound: 'from' | 'to', value: string): void => {
    if (!isCalendarDate(value)) return
    if (bound === 'from') onChange({ from: value, to: value > range.to ? value : range.to })
    else onChange({ from: value < range.from ? value : range.from, to: value })
  }
  return (
    <div role="group" aria-label="Période personnalisée" className="flex items-center gap-2">
      <Label htmlFor="range-from">Du</Label>
      <Input
        id="range-from"
        type="date"
        className="w-40"
        value={range.from}
        onChange={(e) => change('from', e.currentTarget.value)}
      />
      <Label htmlFor="range-to">Au</Label>
      <Input
        id="range-to"
        type="date"
        className="w-40"
        value={range.to}
        onChange={(e) => change('to', e.currentTarget.value)}
      />
    </div>
  )
}
