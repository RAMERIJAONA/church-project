import { cva } from 'class-variance-authority'

export const segmentedRoot = cva(
  'inline-flex items-center gap-0.5 rounded-lg border bg-muted p-0.5'
)

// Pas de transition de couleur (CLAUDE.md par. 6) : changement d'état instantané.
export const segmentedItem = cva(
  [
    'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap',
    'text-muted-foreground outline-none select-none hover:text-foreground',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-muted',
    'data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-sm',
    'disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0'
  ],
  {
    variants: {
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-8 px-3 text-sm'
      }
    },
    defaultVariants: { size: 'md' }
  }
)
