import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { MAX_YEAR, MIN_YEAR } from '@shared/domain/accounting/accounting.types'

export interface YearStepperProps {
  year: number
  currentYear: number
  onChange: (year: number) => void
}

/** Année affichée : flèches précédente / suivante, retour rapide à l'année en cours. */
export function YearStepper({ year, currentYear, onChange }: YearStepperProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div role="group" aria-label="Année" className="flex items-center rounded-lg border bg-card">
        <Button
          variant="ghost"
          size="icon"
          title="Année précédente"
          aria-label="Année précédente"
          disabled={year <= MIN_YEAR}
          onClick={() => onChange(year - 1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <output
          aria-live="polite"
          aria-label="Année affichée"
          className="min-w-16 text-center font-display text-lg font-semibold tabular-nums"
        >
          {year}
        </output>
        <Button
          variant="ghost"
          size="icon"
          title="Année suivante"
          aria-label="Année suivante"
          disabled={year >= MAX_YEAR}
          onClick={() => onChange(year + 1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
      {year !== currentYear && (
        <Button variant="link" size="sm" className="px-0" onClick={() => onChange(currentYear)}>
          Revenir à {currentYear}
        </Button>
      )}
    </div>
  )
}
