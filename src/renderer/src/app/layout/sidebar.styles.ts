import { cva } from 'class-variance-authority'

export const navLink = cva(
  [
    'group flex h-9 items-center gap-3 rounded-md px-3 text-sm outline-none',
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
