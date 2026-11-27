import { cva } from 'class-variance-authority'

/**
 * Cadre du tableau : seul élément qui défile (demande du porteur, 2026-11-27) ; il rétrécit
 * jusqu'à la hauteur disponible (min-h-0 dans la page en colonne), défilement horizontal aussi
 * si la fenêtre est trop étroite.
 */
export const tableFrame = 'min-h-0 overflow-auto rounded-xl border bg-card text-sm'

/**
 * Tableau : colonnes regroupées et texte qui revient à la ligne pour tenir dans la fenêtre sans
 * défilement horizontal (porteur, 2026-11-27) ; chaque tableau fixe sa largeur minimale, juste
 * pour les très petits écrans.
 */
export const table = 'w-full border-collapse'

export const headCell = cva(
  'sticky top-0 z-10 border-b bg-card px-3 py-2.5 text-xs font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase',
  {
    variants: { align: { left: 'text-left', center: 'text-center', right: 'text-right' } },
    defaultVariants: { align: 'left' }
  }
)

export const bodyCell = cva('border-b px-3 py-2 align-top group-last:border-b-0', {
  variants: {
    align: { left: 'text-left', center: 'text-center', right: 'text-right' },
    numeric: { true: 'whitespace-nowrap tabular-nums', false: '' },
    /** Toujours sur une ligne : le secteur (porteur, 2026-11-27) */
    nowrap: { true: 'whitespace-nowrap', false: '' }
  },
  defaultVariants: { align: 'left', numeric: false, nowrap: false }
})

export const row = 'group hover:bg-muted/50'

/** Colonne des icônes d'action : aussi étroite que son contenu, toujours à droite */
export const actionsCell = 'w-px whitespace-nowrap'

export const lastNameText = 'font-semibold'

/** Seconde ligne d'une cellule : adresse sous le nom, âge sous la date */
export const subText = 'mt-0.5 text-xs text-muted-foreground'

export const addressText = subText

export const rowActions =
  'flex items-center justify-end opacity-40 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100'

export const menuItem = 'w-full justify-start'

/** Valeur absente mise en évidence sans alarmer : « Parrain à désigner », « Aucun membre » */
export const missingText = 'text-muted-foreground italic'

/** Nom cliquable qui ouvre un foyer ou une fiche */
export const openButton =
  'cursor-pointer text-left font-semibold underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none'

/** Liste de choix d'un parrain (dans un Popover) */
export const pickerOption =
  'flex w-full cursor-pointer flex-col items-start rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted aria-selected:bg-accent aria-selected:text-accent-foreground'

/** Badge « Diacre », bien visible dans les listes (porteur, 2026-11-27) */
export const deaconBadge =
  'inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'

export const matriculeText = 'font-semibold whitespace-nowrap tabular-nums'

export const sortButton =
  'inline-flex cursor-pointer items-center gap-1 uppercase hover:text-foreground focus-visible:text-foreground focus-visible:outline-none'
