import {
  ArrowDownToLine,
  ArrowUpFromLine,
  House,
  MapPin,
  Settings,
  Users,
  UsersRound,
  type LucideIcon
} from 'lucide-react'

export interface NavItem {
  to: string
  /** Texte affiché, court pour tenir sur une ligne */
  label: string
  icon: LucideIcon
  /** Titre de section affiché au-dessus du premier élément de la section */
  section?: string
  /** Nom complet (lecteurs d'écran, infobulle), s'il diffère du texte affiché */
  title?: string
}

/** Les modules métier s'ajouteront ici (un item par feature). */
export const MAIN_NAV: readonly NavItem[] = [
  { to: '/', label: 'Accueil', icon: House },
  // Fidèles, foyers, secteurs : module indépendant de la comptabilité (2026-11-27)
  { to: '/foyers', label: 'Foyers', section: 'Fidèles', icon: UsersRound },
  {
    to: '/fideles',
    label: 'Liste des fidèles',
    title: 'Liste des fidèles, tous foyers confondus',
    section: 'Fidèles',
    icon: Users
  },
  { to: '/secteurs', label: 'Secteurs', section: 'Fidèles', icon: MapPin },
  // Libellés courts sous un titre « Comptabilité » : une ligne chacun (2026-11-25)
  {
    to: '/comptabilite/entrees',
    label: 'Entrées',
    title: 'Comptabilité des entrées',
    section: 'Comptabilité',
    icon: ArrowDownToLine
  },
  {
    to: '/comptabilite/sorties',
    label: 'Sorties',
    title: 'Comptabilité des sorties',
    section: 'Comptabilité',
    icon: ArrowUpFromLine
  }
]

export const FOOTER_NAV: readonly NavItem[] = [
  { to: '/parametres', label: 'Paramètres', icon: Settings }
]
