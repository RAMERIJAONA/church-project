import { List } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import type { CellDTO } from '@shared/domain/accounting/accounting.types'
import { formatAmount } from '@shared/utils/money'
import { AmountInput } from './AmountInput'
import { amountCell, amountReadonly } from './accounting.styles'

export interface AmountCellProps {
  cell: CellDTO
  /** « Réalisation 2026 de F1-I-1 » : nom accessible de la case */
  label: string
  disabled: boolean
  onCommit: (amount: number | null) => void
  onOpenDetail: () => void
}

/**
 * Une case de montant. Simple (vide ou un total sans libellé) : saisie directe. Détaillée
 * (plusieurs saisies ou un libellé) : total en lecture seule, modification depuis le détail.
 */
export function AmountCell({
  cell,
  label,
  disabled,
  onCommit,
  onOpenDetail
}: AmountCellProps): React.JSX.Element {
  return (
    <td className="px-1 py-1">
      <div className={amountCell}>
        {cell.detailed ? (
          <span
            className={amountReadonly}
            title="Montant détaillé : ouvrir le détail pour modifier"
          >
            {cell.total === null ? '' : formatAmount(cell.total)}
          </span>
        ) : (
          <AmountInput value={cell.total} label={label} disabled={disabled} onCommit={onCommit} />
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          title={cell.detailed ? `Détail (${cell.entryCount} saisies)` : 'Détailler ce montant'}
          aria-label={`Détail : ${label}`}
          disabled={disabled}
          className="shrink-0 text-muted-foreground"
          onClick={onOpenDetail}
        >
          <List aria-hidden />
        </Button>
      </div>
    </td>
  )
}
