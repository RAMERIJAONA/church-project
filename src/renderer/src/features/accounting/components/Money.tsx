import { CURRENCY, formatAmount, THOUSANDS_SEPARATOR } from '@shared/utils/money'
import { currencyMark } from './accounting.styles'

/** « 2 000 000 Ar », le sigle en discret comme dans les champs de saisie. */
export function Money({ amount }: { amount: number }): React.JSX.Element {
  return (
    <>
      {formatAmount(amount)}
      <span className={currencyMark}>
        {THOUSANDS_SEPARATOR}
        {CURRENCY}
      </span>
    </>
  )
}
