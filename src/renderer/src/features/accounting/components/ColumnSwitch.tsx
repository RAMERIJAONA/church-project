import { Button } from '@renderer/components/ui/button'
import { AMOUNT_COLUMNS, columnLabel, type AmountColumn } from '../accounting.utils'

export interface ColumnSwitchProps {
  /** Année N de la période (année de son premier jour) */
  year: number
  column: AmountColumn
  onChange: (column: AmountColumn) => void
}

/**
 * Vues par période : montants affichés, imprimés et exportés (demande du porteur, 2026-11-26) :
 * Estimation N, Réalisation N ou Estimation N+1.
 */
export function ColumnSwitch({ year, column, onChange }: ColumnSwitchProps): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label="Montants affichés"
      data-print="hide"
      className="flex w-fit items-center rounded-lg border bg-card p-0.5"
    >
      {AMOUNT_COLUMNS.map((c) => (
        <Button
          key={c}
          size="sm"
          variant={c === column ? 'secondary' : 'ghost'}
          aria-pressed={c === column}
          onClick={() => onChange(c)}
        >
          {columnLabel(year, c)}
        </Button>
      ))}
    </div>
  )
}
