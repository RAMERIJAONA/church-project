import { Plus, Printer } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import type { AccountingView } from '../accounting.utils'
import { ViewSwitch } from './ViewSwitch'

export interface AccountingToolbarProps {
  view: AccountingView
  onViewChange: (view: AccountingView) => void
  /** Navigation de la vue : année ou période */
  navigation: React.ReactNode
  /** Imprime le tableau affiché */
  onPrint: () => void
  /** Vue Année uniquement ; bouton masqué pendant la création */
  onNewSection?: () => void
  creating?: boolean
}

export function AccountingToolbar({
  view,
  onViewChange,
  navigation,
  onPrint,
  onNewSection,
  creating = false
}: AccountingToolbarProps): React.JSX.Element {
  return (
    <div data-print="hide" className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <ViewSwitch view={view} onChange={onViewChange} />
        {navigation}
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onPrint}>
          <Printer aria-hidden />
          Imprimer
        </Button>
        {onNewSection && !creating && (
          <Button onClick={onNewSection}>
            <Plus aria-hidden />
            Nouvelle rubrique
          </Button>
        )}
      </div>
    </div>
  )
}
