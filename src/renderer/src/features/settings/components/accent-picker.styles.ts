import { cva } from 'class-variance-authority'

export const accentSwatch = cva([
  'relative flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary',
  'text-primary-foreground outline-none',
  'ring-offset-2 ring-offset-card focus-visible:ring-2 focus-visible:ring-ring',
  'data-[state=checked]:ring-2 data-[state=checked]:ring-foreground/70',
  'disabled:cursor-not-allowed disabled:opacity-50'
])
