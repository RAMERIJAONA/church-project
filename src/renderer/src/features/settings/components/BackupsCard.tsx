import { ArchiveRestore, Download, FolderOpen, LoaderCircle, Save } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import type { BackupDTO } from '@shared/ipc/contract'
import { formatDateTime } from '@shared/utils/dates'
import { formatBytes } from '@shared/utils/format'
import { backupReasonLabel } from '../settings.utils'

export interface BackupsCardProps {
  backups: BackupDTO[] | undefined
  isLoading: boolean
  loadError?: string
  busy: { create: boolean; export: boolean; restore: boolean }
  onCreate: () => void
  onExport: () => void
  onRestore: () => void
  onOpenFolder: () => void
}

const Spinner = (): React.JSX.Element => <LoaderCircle className="animate-spin" aria-hidden />

export function BackupsCard(props: BackupsCardProps): React.JSX.Element {
  const { backups, isLoading, loadError, busy } = props
  const recent = backups?.slice(0, 5) ?? []
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sauvegardes</CardTitle>
        <CardDescription>
          Une sauvegarde automatique est faite chaque jour au démarrage (les 14 dernières sont
          conservées dans Documents › Church Manager › Sauvegardes).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          <Button onClick={props.onCreate} disabled={busy.create}>
            {busy.create ? <Spinner /> : <Save aria-hidden />}
            Sauvegarder maintenant
          </Button>
          <Button variant="outline" onClick={props.onExport} disabled={busy.export}>
            {busy.export ? <Spinner /> : <Download aria-hidden />}
            Exporter une copie…
          </Button>
          <Button variant="outline" onClick={props.onRestore} disabled={busy.restore}>
            {busy.restore ? <Spinner /> : <ArchiveRestore aria-hidden />}
            Restaurer…
          </Button>
          <Button variant="ghost" onClick={props.onOpenFolder}>
            <FolderOpen aria-hidden />
            Ouvrir le dossier
          </Button>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Dernières sauvegardes</h3>
          {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {loadError && (
            <p role="alert" className="text-sm text-destructive">
              {loadError}
            </p>
          )}
          {!isLoading && !loadError && recent.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune sauvegarde pour l’instant. La première sera faite automatiquement.
            </p>
          )}
          {recent.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {recent.map((b) => (
                <li
                  key={b.fileName}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                >
                  <span className="tabular-nums">{formatDateTime(new Date(b.createdAt))}</span>
                  <span className="flex items-center gap-4 text-muted-foreground">
                    <span>{backupReasonLabel(b.fileName)}</span>
                    <span className="w-16 text-right tabular-nums">{formatBytes(b.size)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
