import { Money } from './Money'
import { amountCell, amountTd, detailSpacer, subtotalText } from './accounting.styles'

export interface SubtotalCellProps {
  /** `null` : aucune rubrique concernée n'a de montant (case vide) */
  value: number | null
  title?: string
}

/**
 * Sous-total d'un groupe ou total général, en lecture seule. Même structure qu'une case de
 * montant (place du bouton de détail réservée) pour que les chiffres tombent sous les montants.
 * Chiffre en gras : « Ar » exactement comme lui (en petit et gris, il paraissait non gras).
 */
export function SubtotalCell({ value, title }: SubtotalCellProps): React.JSX.Element {
  return (
    <td className={amountTd} title={title}>
      <div className={amountCell}>
        <span className={subtotalText}>
          {value === null ? '' : <Money amount={value} strong />}
        </span>
        <span aria-hidden data-print="hide" className={detailSpacer} />
      </div>
    </td>
  )
}
