import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

export interface PeriodStepperProps {
  /** « Semaine du 23 au 29 novembre 2026 » */
  label: string
  /** La période affichée contient aujourd'hui */
  isCurrent: boolean
  onShift: (delta: -1 | 1) => void
  onToday: () => void
}

/** Période affichée : précédente / suivante, retour rapide à aujourd'hui. */
export function PeriodStepper({
  label,
  isCurrent,
  onShift,
  onToday
}: PeriodStepperProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div
        role="group"
        aria-label="Période"
        className="flex items-center rounded-lg border bg-card"
      >
        <Button
          variant="ghost"
          size="icon"
          title="Période précédente"
          aria-label="Période précédente"
          onClick={() => onShift(-1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <output
          aria-live="polite"
          aria-label="Période affichée"
          className="min-w-56 px-2 text-center font-display text-base font-semibold"
        >
          {label}
        </output>
        <Button
          variant="ghost"
          size="icon"
          title="Période suivante"
          aria-label="Période suivante"
          onClick={() => onShift(1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
      {!isCurrent && (
        <Button variant="link" size="sm" className="px-0" onClick={onToday}>
          Revenir à aujourd’hui
        </Button>
      )}
    </div>
  )
}
