import { Toaster as Sonner } from 'sonner'

export interface ToasterProps {
  theme: 'light' | 'dark'
}

/** Notifications : couleurs des tokens, ombre minimale, bas-droite. */
export function Toaster({ theme }: ToasterProps): React.JSX.Element {
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-popover! text-popover-foreground! border-border! shadow-sm! font-sans!',
          description: 'text-muted-foreground!'
        }
      }}
    />
  )
}
