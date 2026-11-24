import { Button } from '@renderer/components/ui/button'
import { VIEW_LABELS, type AccountingView } from '../accounting.utils'

export interface ViewSwitchProps {
  view: AccountingView
  onChange: (view: AccountingView) => void
}

const VIEWS: AccountingView[] = ['year', 'month', 'week', 'day', 'custom']

/** Choix de la vue : Année (modifiable) ou réalisations par mois, semaine, jour, ou entre deux dates. */
export function ViewSwitch({ view, onChange }: ViewSwitchProps): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label="Vue"
      className="flex items-center rounded-lg border bg-card p-0.5"
    >
      {VIEWS.map((v) => (
        <Button
          key={v}
          size="sm"
          variant={v === view ? 'secondary' : 'ghost'}
          aria-pressed={v === view}
          onClick={() => onChange(v)}
        >
          {VIEW_LABELS[v]}
        </Button>
      ))}
    </div>
  )
}
