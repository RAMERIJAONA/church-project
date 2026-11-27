import { cva } from 'class-variance-authority'

/**
 * Cadre du tableau : seul élément qui défile (demande du porteur, 2026-11-27) ; il rétrécit
 * jusqu'à la hauteur disponible (min-h-0 dans la page en colonne), défilement horizontal aussi
 * si la fenêtre est trop étroite.
 */
export const tableFrame = 'min-h-0 overflow-auto rounded-xl border bg-card text-sm'

export const table = 'w-full min-w-[56rem] border-collapse'

export const headCell = cva(
  'sticky top-0 z-10 border-b bg-card px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase',
  {
    variants: { align: { left: 'text-left', center: 'text-center', right: 'text-right' } },
    defaultVariants: { align: 'left' }
  }
)

export const bodyCell = cva('border-b px-3 py-2 align-top group-last:border-b-0', {
  variants: {
    align: { left: 'text-left', center: 'text-center', right: 'text-right' },
    numeric: { true: 'whitespace-nowrap tabular-nums', false: '' }
  },
  defaultVariants: { align: 'left', numeric: false }
})

export const row = 'group hover:bg-muted/50'

export const lastNameText = 'font-semibold'

export const addressText = 'mt-0.5 text-xs text-muted-foreground'

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
