import { cva } from 'class-variance-authority'

export const navLink = cva(
  [
    // Hauteur minimale (pas fixe) et marge interne : un libellé sur 2 lignes reste aéré
    'group flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm leading-tight outline-none',
    'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
    '[&_svg]:size-4 [&_svg]:shrink-0'
  ],
  {
    variants: {
      active: {
        true: 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
        false: 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
      }
    },
    defaultVariants: { active: false }
  }
)

/** Titre de section du menu (« Comptabilité »), au-dessus de ses liens. */
export const navSection =
  'px-3 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase'
