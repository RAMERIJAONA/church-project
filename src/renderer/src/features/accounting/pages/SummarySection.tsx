import { useMemo } from 'react'
import { localInstantRange } from '@shared/domain/accounting/accounting.periods'
import type { EnteredTotalsDTO, Ledger } from '@shared/domain/accounting/accounting.types'
import { sheetTotals, summaryPeriods, type SummaryPeriod } from '../accounting.utils'
import { SummaryTable, type SummaryCell, type SummaryRow } from '../components/SummaryTable'
import { useAccountingSheet, useEnteredTotalsMany } from '../queries'

export interface SummarySectionProps {
  ledger: Ledger
  /** Date locale du jour, « AAAA-MM-JJ » */
  today: string
  /** Vrai si la vue affichée correspond à cette colonne */
  isShown: (period: SummaryPeriod) => boolean
  onSelect: (kind: SummaryPeriod['kind']) => void
}

type Line = keyof EnteredTotalsDTO

/**
 * Container de la synthèse (règle du porteur, 2026-11-26). Jour, semaine, mois : somme des
 * valeurs saisies pendant la période (date de saisie), pour les trois lignes. Année : total
 * complet de l'année, comme la ligne « Total général » (une estimation saisie à l'avance, l'année
 * d'avant, compte aussi).
 */
export function SummarySection({
  ledger,
  today,
  isShown,
  onSelect
}: SummarySectionProps): React.JSX.Element {
  const year = Number(today.slice(0, 4))
  const periods = useMemo(() => summaryPeriods(today), [today])
  const short = periods.filter((p) => p.kind !== 'year')
  const entered = useEnteredTotalsMany(
    short.map((p) => ({ ledger, year, ...localInstantRange(p.range) }))
  )
  const sheet = useAccountingSheet(year, ledger)
  // Les données affichées doivent être celles de l'année en cours (pas l'année d'avant en cache)
  const grand = useMemo(
    () =>
      sheet.data?.year === year && sheet.data.ledger === ledger
        ? sheetTotals(sheet.data.items).grand
        : undefined,
    [sheet.data, year, ledger]
  )

  const cellsOf = (line: Line): SummaryCell[] =>
    periods.map((p) => {
      if (p.kind === 'year') {
        return {
          value: grand ? (grand[line] ?? 0) : undefined,
          title: `Total de l’année ${year}, comme la ligne « Total général »`
        }
      }
      const data = entered[short.indexOf(p)]?.data
      return {
        value: data ? (data[line] ?? 0) : undefined,
        title: `Valeurs saisies : ${p.caption}`
      }
    })

  const rows: SummaryRow[] = [
    { label: `Estimation ${year}`, cells: cellsOf('estimate') },
    { label: `Réalisation ${year}`, cells: cellsOf('actual') },
    { label: `Estimation ${year + 1}`, cells: cellsOf('nextEstimate') }
  ]

  return (
    <SummaryTable
      columns={periods.map((p) => ({ ...p, active: isShown(p) }))}
      rows={rows}
      failed={sheet.isError || entered.some((q) => q.isError)}
      onSelect={onSelect}
    />
  )
}
