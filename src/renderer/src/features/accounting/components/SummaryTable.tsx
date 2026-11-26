import { formatAriary } from '@shared/utils/money'
import type { SummaryPeriod } from '../accounting.utils'
import { summaryHead } from './accounting.styles'

export interface SummaryColumn extends SummaryPeriod {
  /** Vue actuellement affichée sur cette période */
  active: boolean
}

export interface SummaryCell {
  /** `undefined` : chargement ; `null` : sans objet (« — ») */
  value: number | null | undefined
  /** Infobulle (ce que la case additionne) */
  title?: string
}

export interface SummaryRow {
  /** « Estimation 2026 », « Réalisation 2026 », « Estimation 2027 » */
  label: string
  /** Sous-titre discret */
  hint?: string
  /** Une case par colonne, dans l'ordre des colonnes */
  cells: SummaryCell[]
}

export interface SummaryTableProps {
  columns: SummaryColumn[]
  rows: SummaryRow[]
  failed: boolean
  onSelect: (kind: SummaryColumn['kind']) => void
}

function cellText(value: SummaryCell['value']): string {
  if (value === undefined) return '…'
  return value === null ? '—' : formatAriary(value)
}

/**
 * Synthèse prévu / réalisé pour aujourd'hui, la semaine, le mois et l'année en cours (demande
 * du porteur, 2026-11-25). Un clic sur une colonne ouvre la vue de la période. Non imprimée.
 */
export function SummaryTable({
  columns,
  rows,
  failed,
  onSelect
}: SummaryTableProps): React.JSX.Element {
  return (
    <section aria-labelledby="summary-title" data-print="hide" className="flex flex-col gap-2">
      <h2 id="summary-title" className="text-sm font-medium text-muted-foreground">
        Synthèse : prévu et réalisé
        {failed && <span className="text-destructive"> : chargement impossible</span>}
      </h2>
      <div className="overflow-x-auto rounded-xl border bg-card text-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <td />
              {columns.map((col) => (
                <th key={col.kind} scope="col" className="p-1 text-right">
                  <button
                    type="button"
                    aria-pressed={col.active}
                    title={`Voir le détail : ${col.caption}`}
                    className={summaryHead({ active: col.active })}
                    onClick={() => onSelect(col.kind)}
                  >
                    <span className="text-xs font-medium tracking-wide uppercase">{col.title}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {col.caption}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-b-0">
                <th scope="row" className="px-3 py-2 text-left font-medium whitespace-nowrap">
                  {row.label}
                  {row.hint && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {row.hint}
                    </span>
                  )}
                </th>
                {row.cells.map((cell, i) => (
                  <td
                    key={columns[i]?.kind ?? i}
                    title={cell.title}
                    className="px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums"
                  >
                    {cellText(cell.value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
