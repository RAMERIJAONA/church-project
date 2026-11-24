import { Moon, Sun } from 'lucide-react'
import { SegmentedControl } from '@renderer/components/common/SegmentedControl'
import { SettingRow } from '@renderer/components/common/SettingRow'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import {
  DENSITIES,
  FONT_SIZES,
  type AppSettings,
  type AppSettingsPatch
} from '@shared/domain/settings/settings.types'
import { DENSITY_LABELS, FONT_SIZE_LABELS, THEME_LABELS } from '../settings.utils'
import { AccentPicker } from './AccentPicker'

export interface AppearanceFormProps {
  settings: AppSettings
  disabled?: boolean
  onChange: (patch: AppSettingsPatch) => void
}

/** Présentationnel : props in, events out. Chaque choix est appliqué immédiatement. */
export function AppearanceForm({
  settings,
  disabled,
  onChange
}: AppearanceFormProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Apparence</CardTitle>
        <CardDescription>
          Les changements s’appliquent tout de suite et sont conservés.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <SettingRow title="Thème" description="Sombre : plus reposant en soirée.">
          <SegmentedControl
            label="Thème"
            value={settings.theme}
            disabled={disabled}
            onValueChange={(theme) => onChange({ theme })}
            options={[
              { value: 'light', label: THEME_LABELS.light, icon: <Sun aria-hidden /> },
              { value: 'dark', label: THEME_LABELS.dark, icon: <Moon aria-hidden /> }
            ]}
          />
        </SettingRow>
        <SettingRow title="Couleur d’accent" description="Boutons, liens et éléments actifs.">
          <AccentPicker
            value={settings.accent}
            disabled={disabled}
            onValueChange={(accent) => onChange({ accent })}
          />
        </SettingRow>
        <SettingRow title="Densité" description="Compacte : plus de lignes visibles à l’écran.">
          <SegmentedControl
            label="Densité"
            value={settings.density}
            disabled={disabled}
            onValueChange={(density) => onChange({ density })}
            options={DENSITIES.map((d) => ({ value: d, label: DENSITY_LABELS[d] }))}
          />
        </SettingRow>
        <SettingRow title="Taille du texte" description="Agrandit l’ensemble de l’interface.">
          <SegmentedControl
            label="Taille du texte"
            value={settings.fontSize}
            disabled={disabled}
            onValueChange={(fontSize) => onChange({ fontSize })}
            options={FONT_SIZES.map((f) => ({ value: f, label: FONT_SIZE_LABELS[f] }))}
          />
        </SettingRow>
      </CardContent>
    </Card>
  )
}
