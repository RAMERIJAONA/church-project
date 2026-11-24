import type { SettingsService } from '@main/services/settings.service'
import type { Handle } from './handle'

export function registerSettingsIpc(handle: Handle, settings: SettingsService): void {
  handle('settings.get', () => settings.get())
  handle('settings.update', (patch) => settings.update(patch))
}
