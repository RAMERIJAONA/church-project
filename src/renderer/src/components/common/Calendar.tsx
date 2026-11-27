import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { monthGrid, periodRange, shiftPeriod } from '@shared/domain/accounting/accounting.periods'
import { calendarDay, calendarSelect } from './calendar.styles'

export interface CalendarProps {
  /** Date choisie « AAAA-MM-JJ » */
  value: string
  /** Aujourd'hui « AAAA-MM-JJ » (mis en évidence) */
  today: string
  min?: string
  max?: string
  onSelect: (date: string) => void
}

const utc = (date: string): Date => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1))
}
const fmt = (o: Intl.DateTimeFormatOptions): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat('fr-FR', { ...o, timeZone: 'UTC' })
const dayName = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const weekdayShort = fmt({ weekday: 'short' })
const monthName = fmt({ month: 'long' })
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  monthName.format(new Date(Date.UTC(2026, i, 1)))
)
/** Lundi 5 janvier 2026 → dimanche 11 janvier 2026 : en-têtes des colonnes */
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  weekdayShort.format(new Date(Date.UTC(2026, 0, 5 + i)))
)

const pad = (n: number): string => String(n).padStart(2, '0')
const addDays = (date: string, days: number): string => {
  const d = utc(date)
  d.setUTCDate(d.getUTCDate() + days)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

const KEY_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7
}

/**
 * Calendrier d'un mois en français (semaines du lundi au dimanche), sans dépendance.
 * Clavier : flèches (jour / semaine), Page préc. / suiv. (mois), Entrée ou Espace pour choisir.
 */
export function Calendar({ value, today, min, max, onSelect }: CalendarProps): React.JSX.Element {
  // Sans date choisie : aujourd'hui, ramené dans les bornes
  const [focused, setFocused] = useState(
    () => value || (max && today > max ? max : min && today < min ? min : today)
  )
  const gridRef = useRef<HTMLTableElement>(null)
  const month = periodRange('month', focused)
  const [year, monthIndex] = [Number(focused.slice(0, 4)), Number(focused.slice(5, 7)) - 1]
  const firstYear = Number((min ?? '1900').slice(0, 4))
  const lastYear = Number((max ?? '2200').slice(0, 4))
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i)
  const allowed = (d: string): boolean => (!min || d >= min) && (!max || d <= max)

  useEffect(() => {
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus()
  }, [focused])

  /** Va au même jour d'un autre mois (borné à la fin du mois visé). */
  const goToMonth = (y: number, m: number): void => {
    const target = `${y}-${pad(m + 1)}-01`
    const end = periodRange('month', target).to
    const day = `${y}-${pad(m + 1)}-${focused.slice(8)}`
    setFocused(day > end ? end : day)
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    const step = KEY_STEPS[e.key]
    let next: string | null = null
    if (step !== undefined) next = addDays(focused, step)
    else if (e.key === 'PageUp' || e.key === 'PageDown') {
      const first = shiftPeriod('month', focused, e.key === 'PageUp' ? -1 : 1)
      return void (
        e.preventDefault(),
        goToMonth(Number(first.slice(0, 4)), Number(first.slice(5, 7)) - 1)
      )
    }
    if (next && allowed(next)) {
      e.preventDefault()
      setFocused(next)
    }
  }

  const shiftMonth = (delta: -1 | 1): void => {
    const first = shiftPeriod('month', focused, delta)
    goToMonth(Number(first.slice(0, 4)), Number(first.slice(5, 7)) - 1)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mois précédent"
          title="Mois précédent"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <select
          aria-label="Mois"
          className={calendarSelect}
          value={monthIndex}
          onChange={(e) => goToMonth(year, Number(e.currentTarget.value))}
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Année"
          className={calendarSelect}
          value={year}
          onChange={(e) => goToMonth(Number(e.currentTarget.value), monthIndex)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mois suivant"
          title="Mois suivant"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <table
        ref={gridRef}
        role="grid"
        aria-label={`${MONTHS[monthIndex]} ${year}`}
        onKeyDown={onKeyDown}
      >
        <thead>
          <tr>
            {WEEKDAYS.map((d) => (
              <th key={d} scope="col" className="pb-1 text-xs font-medium text-muted-foreground">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(focused).map((week) => (
            <tr key={week[0]}>
              {week.map((date) => (
                <td key={date} role="gridcell" aria-selected={date === value} className="p-0.5">
                  <button
                    type="button"
                    data-date={date}
                    tabIndex={date === focused ? 0 : -1}
                    aria-label={dayName.format(utc(date))}
                    aria-current={date === today ? 'date' : undefined}
                    disabled={!allowed(date)}
                    className={calendarDay({
                      selected: date === value,
                      today: date === today,
                      outside: date < month.from || date > month.to
                    })}
                    onClick={() => onSelect(date)}
                  >
                    {Number(date.slice(8))}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
