import { Plus } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { YearStepper } from './YearStepper'

export interface AccountingToolbarProps {
  year: number
  currentYear: number
  onYearChange: (year: number) => void
  onNewSection: () => void
  /** Masque le bouton pendant que le formulaire de création est ouvert */
  creating: boolean
}

export function AccountingToolbar({
  year,
  currentYear,
  onYearChange,
  onNewSection,
  creating
}: AccountingToolbarProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <YearStepper year={year} currentYear={currentYear} onChange={onYearChange} />
      <div className="flex items-center gap-4">
        <p className="hidden text-xs text-muted-foreground lg:block">
          Astuce : tapez un montant puis <kbd className="font-sans font-semibold">Entrée</kbd> pour
          passer à la case suivante.
        </p>
        {!creating && (
          <Button onClick={onNewSection}>
            <Plus aria-hidden />
            Nouvelle rubrique
          </Button>
        )}
      </div>
    </div>
  )
}
