import { CURRENCY, formatAmount, THOUSANDS_SEPARATOR } from '@shared/utils/money'
import { currencyMark } from './accounting.styles'

export interface MoneyProps {
  amount: number
  /** Montant en gras (sous-totaux, totaux) : « Ar » exactement comme le chiffre */
  strong?: boolean
}

/** « 2 000 000 Ar », le sigle en discret comme dans les champs de saisie (sauf `strong`). */
export function Money({ amount, strong = false }: MoneyProps): React.JSX.Element {
  return (
    <>
      {formatAmount(amount)}
      <span className={currencyMark({ strong })}>
        {THOUSANDS_SEPARATOR}
        {CURRENCY}
      </span>
    </>
  )
}
