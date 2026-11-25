import { useMemo } from 'react'
import { dayCount, prorateEstimate } from '@shared/domain/accounting/accounting.periods'
import {
  sheetTotals,
  summaryPeriods,
  sumPeriodTotals,
  type SummaryPeriod
} from '../accounting.utils'
import { SummaryTable, type SummaryRow } from '../components/SummaryTable'
import { useAccountingSheet, usePeriodTotalsMany } from '../queries'

export interface SummarySectionProps {
  /** Date locale du jour, « AAAA-MM-JJ » */
  today: string
  /** Vrai si la vue affichée correspond à cette colonne */
  isShown: (period: SummaryPeriod) => boolean
  onSelect: (kind: SummaryPeriod['kind']) => void
}

/**
 * Container de la synthèse : réalisations par période (date d'opération) et estimations de
 * l'année en cours au prorata des jours (`prorateEstimate`) ; Estimation N+1 seulement sur
 * l'année (pas encore son année pour un jour, une semaine, un mois de N).
 */
export function SummarySection({
  today,
  isShown,
  onSelect
}: SummarySectionProps): React.JSX.Element {
  const year = Number(today.slice(0, 4))
  const periods = useMemo(() => summaryPeriods(today), [today])
  const actual = usePeriodTotalsMany(periods.map((p) => p.range))
  const sheet = useAccountingSheet(year)
  // Les données affichées doivent être celles de l'année en cours (pas l'année d'avant en cache)
  const grand = useMemo(
    () => (sheet.data?.year === year ? sheetTotals(sheet.data.items).grand : undefined),
    [sheet.data, year]
  )
  const yearDays = dayCount({ from: `${year}-01-01`, to: `${year}-12-31` })

  const rows: SummaryRow[] = [
    {
      label: `Estimation ${year}`,
      hint: 'au prorata des jours',
      cells: periods.map((p) => {
        const days = dayCount(p.range)
        return {
          value: grand ? prorateEstimate(grand.estimate ?? 0, p.range, year) : undefined,
          title:
            p.kind === 'year'
              ? `Estimation ${year} complète`
              : `Estimation ${year} × ${days} / ${yearDays} jours`
        }
      })
    },
    {
      label: `Réalisation ${year}`,
      cells: actual.map((q) => ({ value: q.data ? (sumPeriodTotals(q.data) ?? 0) : undefined }))
    },
    {
      label: `Estimation ${year + 1}`,
      cells: periods.map((p) => ({
        value: p.kind !== 'year' ? null : grand ? (grand.nextEstimate ?? 0) : undefined,
        title: p.kind !== 'year' ? `Pas de prorata : ${year + 1} n’a pas commencé` : undefined
      }))
    }
  ]

  return (
    <SummaryTable
      columns={periods.map((p) => ({ ...p, active: isShown(p) }))}
      rows={rows}
      failed={sheet.isError || actual.some((q) => q.isError)}
      onSelect={onSelect}
    />
  )
}
