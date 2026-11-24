import { Bug, FileText } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'

export interface HelpCardProps {
  version?: string
  isDebug?: boolean
  onOpenLogs: () => void
}

export function HelpCard({ version, isDebug, onOpenLogs }: HelpCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aide</CardTitle>
        <CardDescription>
          En cas de problème, transmettez le fichier de log à la personne qui assure le support.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Version</dt>
          <dd className="tabular-nums">{version ?? '…'}</dd>
          {isDebug && (
            <>
              <dt className="text-muted-foreground">Mode</dt>
              <dd className="flex items-center gap-1.5">
                <Bug className="size-3.5" aria-hidden />
                Diagnostic (F12 : outils de développement)
              </dd>
            </>
          )}
        </dl>
        <Button variant="outline" onClick={onOpenLogs}>
          <FileText aria-hidden />
          Ouvrir le dossier des logs
        </Button>
      </CardContent>
    </Card>
  )
}
