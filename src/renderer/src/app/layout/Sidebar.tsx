import { Church } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAppInfo } from '@renderer/lib/app-info.queries'
import { APP_NAME } from '@shared/domain/identity'
import { FOOTER_NAV, MAIN_NAV, type NavItem } from './nav-items'
import { navLink, navSection } from './sidebar.styles'

function NavList({ items }: { items: readonly NavItem[] }): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ to, label, title, section, icon: Icon }, i) => (
        <li key={to}>
          {section && section !== items[i - 1]?.section && (
            <p aria-hidden className={navSection}>
              {section}
            </p>
          )}
          <NavLink
            to={to}
            end
            aria-label={title}
            title={title}
            className={({ isActive }) => navLink({ active: isActive })}
          >
            <Icon aria-hidden />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export function Sidebar(): React.JSX.Element {
  const info = useAppInfo()
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex min-h-16 items-center gap-3 px-5 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Church className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="font-display text-base font-semibold text-balance">{APP_NAME}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Gestion de l’église</p>
        </div>
      </div>

      <nav
        aria-label="Navigation principale"
        className="flex flex-1 flex-col justify-between px-3 pb-3"
      >
        <NavList items={MAIN_NAV} />
        <div className="flex flex-col gap-3">
          <NavList items={FOOTER_NAV} />
          <p className="px-3 text-xs text-muted-foreground tabular-nums">
            {info.data ? `Version ${info.data.version}` : ' '}
          </p>
        </div>
      </nav>
    </aside>
  )
}
