import { toast } from 'sonner'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { AppearanceForm } from '../components/AppearanceForm'
import { useSettings, useUpdateSettings } from '../queries'

/** Container : branche les hooks de données sur les composants présentationnels. */
export function SettingsPage(): React.JSX.Element {
  const settings = useSettings()
  const update = useUpdateSettings()

  if (settings.isPending) return <p className="text-sm text-muted-foreground">Chargement…</p>
  if (settings.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {getErrorMessage(settings.error)}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <AppearanceForm
        settings={settings.data}
        onChange={(patch) =>
          update.mutate(patch, { onError: (err) => toast.error(getErrorMessage(err)) })
        }
      />
    </div>
  )
}
