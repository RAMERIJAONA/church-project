import { useMemo } from 'react'
import type { Ledger } from '@shared/domain/accounting/accounting.types'
import { sheetTotals } from '../accounting.utils'
import { YearTotals } from '../components/YearTotals'
import { useAccountingSheet } from '../queries'

/**
 * Container des totaux de l'année : même requête (et même cache) que le tableau de la vue
 * Année ; pendant un changement d'année, l'ancien total reste affiché avec son année.
 */
export function YearTotalsSection({
  ledger,
  year
}: {
  ledger: Ledger
  year: number
}): React.JSX.Element {
  const sheet = useAccountingSheet(year, ledger)
  const totals = useMemo(
    () => (sheet.data ? sheetTotals(sheet.data.items).grand : undefined),
    [sheet.data]
  )
  return <YearTotals year={sheet.data?.year ?? year} totals={totals} />
}
