import { CHURCH_NAME } from '@shared/domain/identity'
import { formatDateTime } from '@shared/utils/dates'

export interface PrintHeaderProps {
  /** « Année 2026 », « Semaine du 23 au 29 novembre 2026 »… */
  title: string
  printedAt: Date
}

/** En-tête visible uniquement à l'impression (print.css : `data-print="only"`). */
export function PrintHeader({ title, printedAt }: PrintHeaderProps): React.JSX.Element {
  return (
    <div data-print="only" className="mb-4 border-b pb-2">
      <h2 className="font-display text-lg font-semibold">{CHURCH_NAME} : comptabilité</h2>
      <p className="text-sm">
        {title} · Imprimé le {formatDateTime(printedAt)}
      </p>
    </div>
  )
}
