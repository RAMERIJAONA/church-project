import { Button } from '@renderer/components/ui/button'
import type { AppSettings, AppSettingsPatch } from '@shared/domain/settings/settings.types'

export interface AppearanceFormProps {
  settings: AppSettings
  disabled?: boolean
  onChange: (patch: AppSettingsPatch) => void
}

/** Présentationnel : props in, events out. */
export function AppearanceForm({
  settings,
  disabled,
  onChange
}: AppearanceFormProps): React.JSX.Element {
  const nextTheme = settings.theme === 'light' ? 'dark' : 'light'
  return (
    <div className="flex items-center gap-3">
      <span>Thème : {settings.theme === 'light' ? 'Clair' : 'Sombre'}</span>
      <Button disabled={disabled} onClick={() => onChange({ theme: nextTheme })}>
        Passer en {nextTheme === 'light' ? 'clair' : 'sombre'}
      </Button>
    </div>
  )
}
