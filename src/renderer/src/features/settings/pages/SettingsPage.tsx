import { toast } from 'sonner'
import { useAppInfo } from '@renderer/lib/app-info.queries'
import { getErrorMessage } from '@renderer/lib/error-messages'
import {
  useBackups,
  useCreateBackup,
  useExportBackup,
  useOpenBackupsFolder,
  useOpenLogsFolder,
  useRestoreBackup
} from '../backup.queries'
import { AppearanceForm } from '../components/AppearanceForm'
import { BackupsCard } from '../components/BackupsCard'
import { HelpCard } from '../components/HelpCard'
import { useSettings, useUpdateSettings } from '../queries'

const onError = (err: unknown): void => {
  toast.error(getErrorMessage(err))
}

/** Container : branche les hooks de données sur les composants présentationnels. */
export function SettingsPage(): React.JSX.Element {
  const settings = useSettings()
  const update = useUpdateSettings()
  const info = useAppInfo()
  const backups = useBackups()
  const create = useCreateBackup()
  const exportBackup = useExportBackup()
  const restore = useRestoreBackup()
  const openBackups = useOpenBackupsFolder()
  const openLogs = useOpenLogsFolder()

  return (
    <div className="flex flex-col gap-6">
      {settings.isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {settings.isError && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(settings.error)}
        </p>
      )}
      {settings.data && (
        <AppearanceForm
          settings={settings.data}
          onChange={(patch) => update.mutate(patch, { onError })}
        />
      )}

      <BackupsCard
        backups={backups.data}
        isLoading={backups.isPending}
        loadError={backups.isError ? getErrorMessage(backups.error) : undefined}
        busy={{
          create: create.isPending,
          export: exportBackup.isPending,
          restore: restore.isPending
        }}
        onCreate={() =>
          create.mutate(undefined, {
            onSuccess: () => toast.success('Sauvegarde effectuée'),
            onError
          })
        }
        onExport={() =>
          exportBackup.mutate(undefined, {
            onSuccess: (res) => {
              if (res.status === 'saved') toast.success('Copie exportée', { description: res.path })
            },
            onError
          })
        }
        onRestore={() =>
          restore.mutate(undefined, {
            onSuccess: (res) => {
              if (res.status === 'restarting') toast.info('Restauration effectuée, redémarrage…')
            },
            onError
          })
        }
        onOpenFolder={() => openBackups.mutate(undefined, { onError })}
      />

      <HelpCard
        version={info.data?.version}
        isDebug={info.data?.isDebug}
        onOpenLogs={() => openLogs.mutate(undefined, { onError })}
      />
    </div>
  )
}
