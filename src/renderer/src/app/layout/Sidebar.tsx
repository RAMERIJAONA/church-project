import { Church } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAppInfo } from '@renderer/lib/app-info.queries'
import { FOOTER_NAV, MAIN_NAV, type NavItem } from './nav-items'
import { navLink } from './sidebar.styles'

function NavList({ items }: { items: readonly NavItem[] }): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink to={to} end className={({ isActive }) => navLink({ active: isActive })}>
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
      <div className="flex h-16 items-center gap-3 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Church className="size-4.5" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="font-display text-base font-semibold">Church Manager</p>
          <p className="text-xs text-muted-foreground">Gestion de l’église</p>
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
