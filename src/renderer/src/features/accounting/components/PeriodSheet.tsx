import type { AccountingItemDTO } from '@shared/domain/accounting/accounting.types'
import { formatAmount } from '@shared/utils/money'
import { flattenTree } from '../accounting.utils'
import { codeCell, col, descriptionCell, headCell, sheetRow } from './accounting.styles'

export interface PeriodSheetProps {
  /** « Semaine du 23 au 29 novembre 2026 » */
  label: string
  /** Éléments de niveau 1 (structure commune à toutes les périodes) */
  items: AccountingItemDTO[]
  /** Somme des réalisations de la période, par élément */
  totals: ReadonlyMap<number, number>
}

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1)

/**
 * Réalisations d'une période (date d'opération), en lecture seule : même arbre que le
 * tableau annuel, une seule colonne. Les modifications se font dans la vue Année.
 */
export function PeriodSheet({ label, items, totals }: PeriodSheetProps): React.JSX.Element {
  const rows = flattenTree(items)
  return (
    <div className="flex flex-col gap-2">
      {totals.size === 0 && (
        <p className="text-sm text-muted-foreground">Aucune réalisation sur cette période.</p>
      )}
      <div className="overflow-clip rounded-xl border bg-card text-sm">
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">Réalisations : {lowerFirst(label)}</caption>
          <colgroup>
            <col className={col.code} />
            <col />
            <col className={col.amount} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={headCell()}>
                N°
              </th>
              <th scope="col" className={headCell()}>
                Description
              </th>
              <th scope="col" className={headCell({ align: 'right' })}>
                Réalisations
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item }) => {
              const kind = item.level === 1 ? 'root' : item.amounts === null ? 'group' : 'leaf'
              const total = item.amounts ? totals.get(item.id) : undefined
              return (
                <tr key={item.id} className={sheetRow({ kind })}>
                  <th scope="row" className={codeCell({ kind })}>
                    {item.code}
                  </th>
                  <td className={descriptionCell({ level: item.level })}>
                    <span className="block truncate px-2 py-1">{item.description}</span>
                  </td>
                  <td className="px-3 py-1 text-right font-medium tabular-nums">
                    {total === undefined ? '' : formatAmount(total)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
