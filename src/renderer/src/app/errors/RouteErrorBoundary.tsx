import { Copy, RotateCcw, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation, useNavigate, useRouteError } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { useAppInfo } from '@renderer/lib/app-info.queries'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { buildErrorDetails } from './error-details'

/** Error Boundary de route : l'écran fautif est remplacé, la navigation reste utilisable. */
export function RouteErrorBoundary(): React.JSX.Element {
  const error = useRouteError()
  const location = useLocation()
  const navigate = useNavigate()
  const info = useAppInfo()

  // Trace côté main (console-message → fichier de log)
  useEffect(() => {
    console.error('Erreur de rendu', location.pathname, error)
  }, [error, location.pathname])

  async function copyDetails(): Promise<void> {
    const text = buildErrorDetails({
      error,
      route: `#${location.pathname}`,
      version: info.data?.version ?? 'inconnue',
      at: new Date()
    })
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Détails copiés dans le presse-papiers')
    } catch (err) {
      console.error('Copie impossible', err)
      toast.error('Impossible de copier les détails')
    }
  }

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold">Cet écran a rencontré un problème</h2>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => void copyDetails()}>
          <Copy aria-hidden />
          Copier les détails
        </Button>
        <Button onClick={() => void navigate('/')}>
          <RotateCcw aria-hidden />
          Revenir à l’accueil
        </Button>
      </div>
    </div>
  )
}
