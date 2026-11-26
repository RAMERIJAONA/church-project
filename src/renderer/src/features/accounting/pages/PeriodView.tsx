import { useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { printWithFeedback } from '@renderer/lib/print'
import { periodTitle } from '@shared/domain/accounting/accounting.export'
import type { DateRange } from '@shared/domain/accounting/accounting.periods'
import type { Ledger } from '@shared/domain/accounting/accounting.types'
import { columnLabel, type AccountingView, type AmountColumn } from '../accounting.utils'
import { AccountingToolbar } from '../components/AccountingToolbar'
import { ColumnSwitch } from '../components/ColumnSwitch'
import { PeriodSheet } from '../components/PeriodSheet'
import { PrintHeader } from '../components/PrintHeader'
import { useAccountingSheet, usePeriodTotals } from '../queries'
import { useExcelExport } from './use-excel-export'

export interface PeriodViewProps {
  ledger: Ledger
  view: Exclude<AccountingView, 'year'>
  range: DateRange
  /** « Semaine du 23 au 29 novembre 2026 », « Du 1 janvier au 24 novembre 2026 » */
  label: string
  /** Précédent / suivant, ou champs Du / Au */
  navigation: React.ReactNode
  /** Montants affichés, imprimés et exportés */
  column: AmountColumn
  onColumnChange: (column: AmountColumn) => void
  onViewChange: (view: AccountingView) => void
}

/**
 * Container des vues par période (mois, semaine, jour, personnalisée) : la colonne choisie
 * (Estimation N, Réalisation N, Estimation N+1 ; N = année du premier jour), saisies faites
 * pendant la période, sous-totaux et total, en lecture seule.
 */
export function PeriodView({
  ledger,
  view,
  range,
  label,
  navigation,
  column,
  onColumnChange,
  onViewChange
}: PeriodViewProps): React.JSX.Element {
  const year = Number(range.from.slice(0, 4))
  // La structure (rubriques, numéros) est la même pour toutes les années
  const sheet = useAccountingSheet(year, ledger)
  const totals = usePeriodTotals({ ...range, ledger, column })
  const columnTitle = columnLabel(year, column)
  const excel = useExcelExport()
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
        onExport={() => excel.run({ view, ledger, ...range, column })}
        exporting={excel.pending}
      />
      <ColumnSwitch year={year} column={column} onChange={onColumnChange} />
      <PrintHeader
        ledger={ledger}
        title={periodTitle(year, column, label)}
        printedAt={new Date()}
      />
      <p data-print="hide" className="text-sm text-muted-foreground">
        Somme des montants « {columnTitle} » saisis sur cette période. Pour saisir ou modifier un
        montant,{' '}
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
        <PeriodSheet label={label} columnTitle={columnTitle} items={items} totals={totalById} />
      )}
    </div>
  )
}
