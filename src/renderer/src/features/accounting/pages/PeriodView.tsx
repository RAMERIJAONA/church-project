import { useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { printWithFeedback } from '@renderer/lib/print'
import type { DateRange } from '@shared/domain/accounting/accounting.periods'
import type { AccountingView } from '../accounting.utils'
import { AccountingToolbar } from '../components/AccountingToolbar'
import { PeriodSheet } from '../components/PeriodSheet'
import { PrintHeader } from '../components/PrintHeader'
import { useAccountingSheet, usePeriodTotals } from '../queries'

export interface PeriodViewProps {
  view: Exclude<AccountingView, 'year'>
  range: DateRange
  /** « Semaine du 23 au 29 novembre 2026 », « Du 1 janvier au 24 novembre 2026 » */
  label: string
  /** Précédent / suivant, ou champs Du / Au */
  navigation: React.ReactNode
  onViewChange: (view: AccountingView) => void
}

/**
 * Container des vues par période (mois, semaine, jour, personnalisée) : réalisations par date
 * d'opération, sous-totaux et total, en lecture seule.
 */
export function PeriodView({
  view,
  range,
  label,
  navigation,
  onViewChange
}: PeriodViewProps): React.JSX.Element {
  // La structure (rubriques, numéros) est la même pour toutes les années
  const sheet = useAccountingSheet(Number(range.from.slice(0, 4)))
  const totals = usePeriodTotals(range)
  const totalById = useMemo(
    () => new Map((totals.data ?? []).map((t) => [t.itemId, t.total])),
    [totals.data]
  )

  const error = sheet.error ?? totals.error
  const items = sheet.data?.items ?? []
  return (
    <div className="flex flex-col gap-5">
      <AccountingToolbar
        view={view}
        onViewChange={onViewChange}
        navigation={navigation}
        onPrint={() => void printWithFeedback()}
      />
      <PrintHeader title={`Réalisations : ${label}`} printedAt={new Date()} />
      <p data-print="hide" className="text-sm text-muted-foreground">
        Somme des réalisations enregistrées sur cette période. Pour saisir ou modifier un montant,{' '}
        <Button variant="link" className="h-auto p-0" onClick={() => onViewChange('year')}>
          passez en vue Année
        </Button>
        .
      </p>

      {(sheet.isPending || totals.isPending) && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}
      {error && (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {getErrorMessage(error)}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void sheet.refetch()
              void totals.refetch()
            }}
          >
            Réessayer
          </Button>
        </div>
      )}
      {sheet.data && items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune rubrique pour l’instant : créez-les dans la vue Année.
        </p>
      )}
      {items.length > 0 && totals.data && (
        <PeriodSheet label={label} items={items} totals={totalById} />
      )}
    </div>
  )
}
