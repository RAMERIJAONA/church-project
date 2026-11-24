import { getErrorMessage } from '@renderer/lib/error-messages'
import { AppearanceForm } from '../components/AppearanceForm'
import { useSettings, useUpdateSettings } from '../queries'

/** Container : branche les hooks de données sur les composants présentationnels. */
export function SettingsPage(): React.JSX.Element {
  const settings = useSettings()
  const update = useUpdateSettings()

  if (settings.isPending) return <p>Chargement…</p>
  if (settings.isError) return <p role="alert">{getErrorMessage(settings.error)}</p>

  return (
    <section className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Paramètres</h1>
      <AppearanceForm
        settings={settings.data}
        disabled={update.isPending}
        onChange={update.mutate}
      />
      {update.isError && <p role="alert">{getErrorMessage(update.error)}</p>}
    </section>
  )
}
