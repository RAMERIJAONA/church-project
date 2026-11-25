import { formatAriary } from '@shared/utils/money'
import { AMOUNT_COLUMNS, columnLabel, type ColumnTotals } from '../accounting.utils'
import { statCard } from './accounting.styles'

export interface YearTotalsProps {
  /** Année affichée N */
  year: number
  /** Somme de chaque colonne ; `undefined` pendant le chargement */
  totals: ColumnTotals | undefined
}

/** « Estimation 2026 » → « Estimations 2026 » (total de la colonne). */
const plural = (label: string): string => label.replace(/^(\S+)/, '$1s')

/**
 * Total de chaque colonne de l'année : estimations N, réalisations N, estimations N+1
 * (demande du porteur, 2026-11-25). Mêmes sommes que la ligne « Total général » du tableau,
 * affichées en haut pour être vues sans descendre. Non imprimé (le tableau a son total).
 */
export function YearTotals({ year, totals }: YearTotalsProps): React.JSX.Element {
  return (
    <section aria-labelledby="year-totals-title" data-print="hide" className="flex flex-col gap-2">
      <h2 id="year-totals-title" className="text-sm font-medium text-muted-foreground">
        Totaux de l’année {year}
      </h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {AMOUNT_COLUMNS.map((col) => {
          const value = totals?.[col]
          return (
            <div key={col} className={statCard}>
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Total des {plural(columnLabel(year, col)).toLowerCase()}
              </dt>
              <dd className="font-display text-xl font-semibold whitespace-nowrap tabular-nums">
                {value === undefined ? '…' : formatAriary(value ?? 0)}
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
