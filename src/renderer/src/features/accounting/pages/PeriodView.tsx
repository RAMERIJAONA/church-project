import { useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import {
  periodLabel,
  periodRange,
  shiftPeriod,
  type PeriodKind
} from '@shared/domain/accounting/accounting.periods'
import { MAX_YEAR, MIN_YEAR } from '@shared/domain/accounting/accounting.types'
import type { AccountingView } from '../accounting.utils'
import { AccountingToolbar } from '../components/AccountingToolbar'
import { PeriodSheet } from '../components/PeriodSheet'
import { PeriodStepper } from '../components/PeriodStepper'
import { useAccountingSheet, usePeriodTotals } from '../queries'

export interface PeriodViewProps {
  kind: PeriodKind
  /** Date de référence « AAAA-MM-JJ » : la période affichée la contient */
  anchor: string
  /** Aujourd'hui, date locale « AAAA-MM-JJ » */
  today: string
  onAnchorChange: (anchor: string) => void
  onViewChange: (view: AccountingView) => void
}

const yearOf = (date: string): number => Number(date.slice(0, 4))

/** Container des vues Mois / Semaine / Jour : réalisations par date d'opération, lecture seule. */
export function PeriodView({
  kind,
  anchor,
  today,
  onAnchorChange,
  onViewChange
}: PeriodViewProps): React.JSX.Element {
  const range = periodRange(kind, anchor)
  const label = periodLabel(kind, range)
  // La structure (rubriques, numéros) est la même pour toutes les années
  const sheet = useAccountingSheet(yearOf(anchor))
  const totals = usePeriodTotals(range)
  const totalById = useMemo(
    () => new Map((totals.data ?? []).map((t) => [t.itemId, t.total])),
    [totals.data]
  )

  const shift = (delta: -1 | 1): void => {
    const next = shiftPeriod(kind, anchor, delta)
    if (yearOf(next) >= MIN_YEAR && yearOf(next) <= MAX_YEAR) onAnchorChange(next)
  }

  const error = sheet.error ?? totals.error
  const items = sheet.data?.items ?? []
  return (
    <div className="flex flex-col gap-5">
      <AccountingToolbar
        view={kind}
        onViewChange={onViewChange}
        navigation={
          <PeriodStepper
            label={label}
            isCurrent={range.from <= today && today <= range.to}
            onShift={shift}
            onToday={() => onAnchorChange(today)}
          />
        }
      />
      <p className="text-sm text-muted-foreground">
        Somme des réalisations par date d’opération. Pour saisir ou modifier, passez en vue Année.
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
