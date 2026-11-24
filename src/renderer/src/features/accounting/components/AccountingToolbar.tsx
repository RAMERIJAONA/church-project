import { Plus } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import type { AccountingView } from '../accounting.utils'
import { ViewSwitch } from './ViewSwitch'

export interface AccountingToolbarProps {
  view: AccountingView
  onViewChange: (view: AccountingView) => void
  /** Navigation de la vue : année ou période */
  navigation: React.ReactNode
  /** Vue Année uniquement ; bouton masqué pendant la création */
  onNewSection?: () => void
  creating?: boolean
}

export function AccountingToolbar({
  view,
  onViewChange,
  navigation,
  onNewSection,
  creating = false
}: AccountingToolbarProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <ViewSwitch view={view} onChange={onViewChange} />
        {navigation}
      </div>
      {onNewSection && (
        <div className="flex items-center gap-4">
          <p className="hidden text-xs text-muted-foreground xl:block">
            Astuce : tapez un montant puis <kbd className="font-sans font-semibold">Entrée</kbd>{' '}
            pour passer à la case suivante.
          </p>
          {!creating && (
            <Button onClick={onNewSection}>
              <Plus aria-hidden />
              Nouvelle rubrique
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
