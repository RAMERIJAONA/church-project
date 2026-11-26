import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  defaultOperationDate,
  localDateOf,
  periodLabel,
  periodRange,
  rangeLabel,
  shiftPeriod,
  type DateRange,
  type PeriodKind
} from '@shared/domain/accounting/accounting.periods'
import {
  MAX_YEAR,
  MIN_YEAR,
  operationDateSchema,
  type Ledger,
  yearSchema
} from '@shared/domain/accounting/accounting.types'
import type { AccountingView, AmountColumn, SummaryPeriod } from '../accounting.utils'
import { CustomRangePicker } from '../components/CustomRangePicker'
import { PeriodStepper } from '../components/PeriodStepper'
import { PeriodView } from './PeriodView'
import { SummarySection } from './SummarySection'
import { YearTotalsSection } from './YearTotalsSection'
import { YearView } from './YearView'

type PeriodViewKind = Exclude<AccountingView, 'year'>

/**
 * Vue dans l'URL : `?annee=2026` (vue Année), `?vue=mois&date=2026-11-24` (mois, semaine, jour),
 * `?vue=personnalise&du=2026-01-01&au=2026-11-24` (période personnalisée).
 */
const VIEW_PARAM: Record<PeriodViewKind, string> = {
  month: 'mois',
  week: 'semaine',
  day: 'jour',
  custom: 'personnalise'
}

/** Montants des vues par période : `?montant=estimation` ; Réalisation N par défaut. */
const COLUMN_PARAM: Record<AmountColumn, string> = {
  estimate: 'estimation',
  actual: 'realisation',
  nextEstimate: 'estimation-suivante'
}

function parseColumn(value: string | null): AmountColumn {
  const columns = Object.keys(COLUMN_PARAM) as AmountColumn[]
  return columns.find((c) => COLUMN_PARAM[c] === value) ?? 'actual'
}

function parseView(value: string | null): PeriodViewKind | null {
  const views = Object.keys(VIEW_PARAM) as PeriodViewKind[]
  return views.find((v) => VIEW_PARAM[v] === value) ?? null
}

/** Date valide de l'URL, dans les années gérées ; sinon `null`. */
function parseDate(value: string | null): string | null {
  const parsed = operationDateSchema.safeParse(value)
  if (!parsed.success) return null
  const year = Number(parsed.data.slice(0, 4))
  return year >= MIN_YEAR && year <= MAX_YEAR ? parsed.data : null
}

const yearOf = (date: string): number => Number(date.slice(0, 4))

/**
 * Container : lit la vue, l'année, la date ou la période dans l'URL (conservées en changeant de
 * page) et affiche la vue Année ou une vue par période.
 */
/** Comptabilité des sorties (dépenses) : A1, B1… */
export function ExpensesPage(): React.JSX.Element {
  return <AccountingPage ledger="expense" />
}

/** Comptabilité des entrées (recettes) : A2, B2… ; mêmes règles et même affichage. */
export function IncomePage(): React.JSX.Element {
  return <AccountingPage ledger="income" />
}

export function AccountingPage({ ledger }: { ledger: Ledger }): React.JSX.Element {
  const today = useMemo(() => localDateOf(new Date()), [])
  const currentYear = yearOf(today)
  const [params, setParams] = useSearchParams()
  const column = parseColumn(params.get('montant'))
  // Le choix des montants suit les changements de vue et de période
  const replace = (next: Record<string, string>, nextColumn = column): void =>
    setParams(nextColumn === 'actual' ? next : { ...next, montant: COLUMN_PARAM[nextColumn] }, {
      replace: true
    })
  const changeColumn = (next: AmountColumn): void => {
    const rest = Object.fromEntries(params)
    delete rest.montant
    replace(rest, next)
  }

  const view = parseView(params.get('vue'))
  const yearParam = yearSchema.safeParse(Number(params.get('annee')))
  const year = yearParam.success ? yearParam.data : currentYear
  const anchor = parseDate(params.get('date')) ?? defaultOperationDate(new Date(), year)
  const from = parseDate(params.get('du'))
  const to = parseDate(params.get('au'))
  const custom: DateRange = from && to && from <= to ? { from, to } : periodRange('month', anchor)

  // Période affichée (vues par période) et date de référence pour changer de vue
  const shown: DateRange | null =
    view === 'custom' ? custom : view ? periodRange(view, anchor) : null
  const reference = view === 'custom' ? custom.from : anchor

  // Synthèse : colonne active = vue affichée sur la même période
  const isShown = (p: SummaryPeriod): boolean =>
    p.kind === 'year'
      ? view === null && year === currentYear
      : view === p.kind && shown?.from === p.range.from && shown.to === p.range.to
  const summaryBlock = (
    <SummarySection
      ledger={ledger}
      today={today}
      isShown={isShown}
      onSelect={(kind) =>
        kind === 'year'
          ? replace({ annee: String(currentYear) })
          : replace({ vue: VIEW_PARAM[kind], date: today })
      }
    />
  )

  const changeView = (next: AccountingView): void => {
    if (next === 'year') replace({ annee: String(yearOf(reference)) })
    else if (next === 'custom') {
      const range = shown ?? periodRange('month', reference)
      replace({ vue: VIEW_PARAM.custom, du: range.from, au: range.to })
    } else replace({ vue: VIEW_PARAM[next], date: reference })
  }

  return (
    <div className="flex flex-col gap-6">
      {view === null && <YearTotalsSection ledger={ledger} year={year} />}
      {summaryBlock}
      {content()}
    </div>
  )

  function content(): React.JSX.Element {
    if (view === 'custom') {
      return (
        <PeriodView
          ledger={ledger}
          view="custom"
          range={custom}
          label={rangeLabel(custom)}
          column={column}
          onColumnChange={changeColumn}
          onViewChange={changeView}
          navigation={
            <CustomRangePicker
              range={custom}
              onChange={(r) => replace({ vue: VIEW_PARAM.custom, du: r.from, au: r.to })}
            />
          }
        />
      )
    }

    if (view) {
      const kind: PeriodKind = view
      const range = periodRange(kind, anchor)
      const label = periodLabel(kind, range)
      const shift = (delta: -1 | 1): void => {
        const next = shiftPeriod(kind, anchor, delta)
        if (yearOf(next) >= MIN_YEAR && yearOf(next) <= MAX_YEAR) {
          replace({ vue: VIEW_PARAM[kind], date: next })
        }
      }
      return (
        <PeriodView
          ledger={ledger}
          view={kind}
          range={range}
          label={label}
          column={column}
          onColumnChange={changeColumn}
          onViewChange={changeView}
          navigation={
            <PeriodStepper
              label={label}
              isCurrent={range.from <= today && today <= range.to}
              onShift={shift}
              onToday={() => replace({ vue: VIEW_PARAM[kind], date: today })}
            />
          }
        />
      )
    }

    return (
      <YearView
        ledger={ledger}
        year={year}
        currentYear={currentYear}
        today={today}
        onYearChange={(y) => replace({ annee: String(y) })}
        onViewChange={changeView}
      />
    )
  }
}
