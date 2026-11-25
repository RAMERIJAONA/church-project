import { CornerDownRight } from 'lucide-react'
import { useMemo } from 'react'
import { rollUp } from '@shared/domain/accounting/accounting.totals'
import type { AccountingItemDTO } from '@shared/domain/accounting/accounting.types'
import { flattenTree } from '../accounting.utils'
import { Money } from './Money'
import {
  codeCell,
  col,
  descriptionCell,
  headCell,
  readOnlyDescription,
  sheetRow,
  totalCell,
  totalRow,
  treeConnector
} from './accounting.styles'

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
  const sums = useMemo(
    () => rollUp(items, (item) => (item.amounts ? (totals.get(item.id) ?? null) : null)),
    [items, totals]
  )
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
              const total = sums.byItem.get(item.id) ?? null
              return (
                <tr key={item.id} data-row={kind} className={sheetRow({ kind })}>
                  <th scope="row" className={codeCell({ level: item.level })}>
                    {item.code}
                  </th>
                  <td className={descriptionCell({ level: item.level })}>
                    <div className="flex items-center gap-1">
                      {item.level > 1 && (
                        <CornerDownRight aria-hidden data-print="hide" className={treeConnector} />
                      )}
                      <span className={readOnlyDescription({ level: item.level })}>
                        {item.description}
                      </span>
                    </div>
                  </td>
                  <td
                    className={
                      item.amounts
                        ? 'px-3 py-1 text-right font-medium whitespace-nowrap tabular-nums'
                        : totalCell
                    }
                  >
                    {total === null ? '' : <Money amount={total} strong={!item.amounts} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className={totalRow}>
              <th scope="row" colSpan={2} className={codeCell()}>
                Total
              </th>
              <td className={totalCell}>
                {sums.grand === null ? '' : <Money amount={sums.grand} strong />}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
