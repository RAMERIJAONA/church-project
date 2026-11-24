import { cva } from 'class-variance-authority'

/** Jour du calendrier : sélectionné, aujourd'hui, hors du mois affiché, désactivé. */
export const calendarDay = cva(
  [
    'flex size-9 items-center justify-center rounded-md text-sm tabular-nums outline-none',
    'hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-30'
  ],
  {
    variants: {
      selected: { true: 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90' },
      today: { true: '' },
      outside: { true: 'text-muted-foreground/60' }
    },
    compoundVariants: [
      {
        selected: false,
        today: true,
        className: 'font-semibold text-primary ring-1 ring-primary/40'
      }
    ],
    defaultVariants: { selected: false, today: false, outside: false }
  }
)

/** Liste déroulante compacte du bandeau (mois, année). */
export const calendarSelect =
  'h-8 appearance-none rounded-md border border-input bg-transparent px-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
