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
