import { Button } from '@renderer/components/ui/button'
import type { DateRange } from '@shared/domain/accounting/accounting.periods'
import { CustomRangePicker } from './CustomRangePicker'

export interface EntriesFilterProps {
  range: DateRange
  /** Faux : toutes les dates (la période affichée couvre toutes les saisies) */
  filtered: boolean
  shownCount: number
  totalCount: number
  onChange: (range: DateRange) => void
  onReset: () => void
}

const saisies = (n: number): string => `${n} saisie${n > 1 ? 's' : ''}`

/** Filtre du détail d'une case par date de saisie (demande du porteur, 2026-11-26). */
export function EntriesFilter({
  range,
  filtered,
  shownCount,
  totalCount,
  onChange,
  onReset
}: EntriesFilterProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Date de saisie :</span>
      <CustomRangePicker label="Filtrer par date de saisie" range={range} onChange={onChange} />
      {filtered && (
        <>
          <Button variant="outline" onClick={onReset}>
            Toutes les dates
          </Button>
          <span role="status" className="text-sm text-muted-foreground">
            {saisies(shownCount)} sur {totalCount}
          </span>
        </>
      )}
    </div>
  )
}
