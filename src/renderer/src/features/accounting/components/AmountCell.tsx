import { List } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import type { CellDTO } from '@shared/domain/accounting/accounting.types'
import { entryDateLabel } from '../accounting.utils'
import { AmountInput } from './AmountInput'
import { Money } from './Money'
import { amountCell, amountReadonly, amountTd } from './accounting.styles'

export interface AmountCellProps {
  cell: CellDTO
  /** « Réalisation 2026 de F1-I-1 » : nom accessible de la case */
  label: string
  /** Année de la case (infobulle : année seule pour une saisie faite après cette année) */
  year: number
  disabled: boolean
  onCommit: (amount: number | null) => void
  onOpenDetail: () => void
}

/**
 * Une case de montant. Simple (vide ou un total sans libellé) : saisie directe. Détaillée
 * (plusieurs saisies ou un libellé) : total en lecture seule, modification depuis le détail.
 * Date et heure de la dernière saisie : dans le détail, et en infobulle sur la case (pas dans
 * le tableau, demande du porteur du 2026-11-25 : affichage plus régulier).
 */
export function AmountCell({
  cell,
  label,
  year,
  disabled,
  onCommit,
  onOpenDetail
}: AmountCellProps): React.JSX.Element {
  return (
    <td
      className={amountTd}
      title={
        cell.lastEntryAt ? `Dernière saisie : ${entryDateLabel(cell.lastEntryAt, year)}` : undefined
      }
    >
      <div className={amountCell}>
        {cell.detailed ? (
          <span
            className={amountReadonly}
            title="Montant détaillé : ouvrir le détail pour modifier"
          >
            {cell.total === null ? '' : <Money amount={cell.total} />}
          </span>
        ) : (
          <AmountInput value={cell.total} label={label} disabled={disabled} onCommit={onCommit} />
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          title={
            cell.detailed
              ? `Voir le détail (${cell.entryCount} saisie${cell.entryCount > 1 ? 's' : ''})`
              : 'Détailler ce montant en plusieurs saisies (avec libellé)'
          }
          aria-label={`Détail : ${label}`}
          data-print="hide"
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
