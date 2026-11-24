import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  defaultOperationDate,
  localDateOf,
  type PeriodKind
} from '@shared/domain/accounting/accounting.periods'
import {
  MAX_YEAR,
  MIN_YEAR,
  operationDateSchema,
  yearSchema
} from '@shared/domain/accounting/accounting.types'
import type { AccountingView } from '../accounting.utils'
import { PeriodView } from './PeriodView'
import { YearView } from './YearView'

/** Vue dans l'URL (`?vue=mois&date=2026-11-24`, ou `?annee=2026` pour la vue Année). */
const VIEW_PARAM: Record<PeriodKind, string> = { month: 'mois', week: 'semaine', day: 'jour' }

function parseKind(value: string | null): PeriodKind | null {
  const found = (Object.keys(VIEW_PARAM) as PeriodKind[]).find((k) => VIEW_PARAM[k] === value)
  return found ?? null
}

/**
 * Container : lit la vue, l'année ou la date dans l'URL (conservées en changeant de page) et
 * affiche la vue Année ou une vue par période.
 */
export function AccountingPage(): React.JSX.Element {
  const today = useMemo(() => localDateOf(new Date()), [])
  const currentYear = Number(today.slice(0, 4))
  const [params, setParams] = useSearchParams()

  const kind = parseKind(params.get('vue'))
  const yearParam = yearSchema.safeParse(Number(params.get('annee')))
  const year = yearParam.success ? yearParam.data : currentYear
  const dateParam = operationDateSchema.safeParse(params.get('date'))
  const datedYear = dateParam.success ? Number(dateParam.data.slice(0, 4)) : NaN
  const anchor =
    dateParam.success && datedYear >= MIN_YEAR && datedYear <= MAX_YEAR
      ? dateParam.data
      : defaultOperationDate(new Date(), year)

  const replace = (next: Record<string, string>): void => setParams(next, { replace: true })
  const changeView = (view: AccountingView): void => {
    if (view === 'year') replace({ annee: kind ? anchor.slice(0, 4) : String(year) })
    else replace({ vue: VIEW_PARAM[view], date: anchor })
  }

  if (kind) {
    return (
      <PeriodView
        kind={kind}
        anchor={anchor}
        today={today}
        onAnchorChange={(date) => replace({ vue: VIEW_PARAM[kind], date })}
        onViewChange={changeView}
      />
    )
  }
  return (
    <YearView
      year={year}
      currentYear={currentYear}
      onYearChange={(y) => replace({ annee: String(y) })}
      onViewChange={changeView}
    />
  )
}
