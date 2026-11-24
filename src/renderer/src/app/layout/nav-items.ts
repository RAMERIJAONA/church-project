import { House, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** Les modules métier s'ajouteront ici (un item par feature). */
export const MAIN_NAV: readonly NavItem[] = [{ to: '/', label: 'Accueil', icon: House }]

export const FOOTER_NAV: readonly NavItem[] = [
  { to: '/parametres', label: 'Paramètres', icon: Settings }
]
