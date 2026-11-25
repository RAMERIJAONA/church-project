import { formatAriary } from '@shared/utils/money'
import type { SummaryPeriod } from '../accounting.utils'
import { summaryCard } from './accounting.styles'

export interface SummaryTile extends SummaryPeriod {
  /** Total des réalisations ; `null` : aucune ; `undefined` : en cours de chargement */
  total: number | null | undefined
  /** Vue actuellement affichée sur cette période */
  active: boolean
}

export interface RealisationSummaryProps {
  tiles: SummaryTile[]
  /** Erreur de chargement d'au moins une période */
  failed: boolean
  onSelect: (kind: SummaryTile['kind']) => void
}

function amountText(total: SummaryTile['total']): string {
  if (total === undefined) return '…'
  return total === null ? '0 Ar' : formatAriary(total)
}

/**
 * Total des réalisations du jour, de la semaine, du mois et de l'année en cours. Un clic ouvre
 * la vue détaillée de la période (demande du porteur, 2026-11-25).
 */
export function RealisationSummary({
  tiles,
  failed,
  onSelect
}: RealisationSummaryProps): React.JSX.Element {
  return (
    <section aria-labelledby="summary-title" data-print="hide" className="flex flex-col gap-2">
      <h2 id="summary-title" className="text-sm font-medium text-muted-foreground">
        Total des réalisations
        {failed && <span className="text-destructive"> : chargement impossible</span>}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <button
            key={tile.kind}
            type="button"
            aria-pressed={tile.active}
            aria-label={`${tile.title} : ${amountText(tile.total)}`}
            title={`Voir le détail : ${tile.caption}`}
            className={summaryCard({ active: tile.active })}
            onClick={() => onSelect(tile.kind)}
          >
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {tile.title}
            </span>
            <span className="font-display text-xl font-semibold tabular-nums">
              {amountText(tile.total)}
            </span>
            <span className="truncate text-xs text-muted-foreground">{tile.caption}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
