import { CHURCH_NAME } from '@shared/domain/identity'
import type { Ledger } from '@shared/domain/accounting/accounting.types'
import { formatDateTime } from '@shared/utils/dates'
import { LEDGER_TITLES } from '../accounting.utils'

export interface PrintHeaderProps {
  ledger: Ledger
  /** « Année 2026 », « Semaine du 23 au 29 novembre 2026 »… */
  title: string
  printedAt: Date
}

/** En-tête visible uniquement à l'impression (print.css : `data-print="only"`). */
export function PrintHeader({ ledger, title, printedAt }: PrintHeaderProps): React.JSX.Element {
  return (
    <div data-print="only" className="mb-4 border-b pb-2">
      <h2 className="font-display text-lg font-semibold">
        {CHURCH_NAME} : {LEDGER_TITLES[ledger].toLowerCase()}
      </h2>
      <p className="text-sm">
        {title} · Imprimé le {formatDateTime(printedAt)}
      </p>
    </div>
  )
}
