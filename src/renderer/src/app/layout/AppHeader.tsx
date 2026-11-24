import { capitalize, formatLongDate } from '@shared/utils/dates'
import { useRouteHandle } from './route-handle'

export function AppHeader(): React.JSX.Element {
  const handle = useRouteHandle()
  const today = capitalize(formatLongDate(new Date()))
  return (
    <header
      data-app-header
      className="flex min-h-16 shrink-0 items-center justify-between gap-6 border-b bg-background px-8"
    >
      <div className="min-w-0 py-3">
        <h1 className="truncate font-display text-2xl font-semibold tracking-tight">
          {handle?.title ?? 'Church Manager'}
        </h1>
        {handle?.description && (
          <p className="truncate text-sm text-muted-foreground">{handle.description}</p>
        )}
      </div>
      <p className="shrink-0 text-sm text-muted-foreground">{today}</p>
    </header>
  )
}
