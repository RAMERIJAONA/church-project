import { useEffect } from 'react'
import type { AppSettings } from '@shared/domain/settings/settings.types'
import { applyTheme } from './apply-theme'

export function useApplyTheme(settings: AppSettings | undefined): void {
  useEffect(() => {
    if (settings) applyTheme(settings)
  }, [settings])
}
