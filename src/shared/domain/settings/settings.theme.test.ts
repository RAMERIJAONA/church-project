import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings.rules'
import { settingsFromQuery, settingsToQuery, themeAttributes } from './settings.theme'

describe('thème', () => {
  it('traduit les préférences en attributs html', () => {
    expect(
      themeAttributes({ theme: 'dark', accent: 'rose', density: 'compact', fontSize: 'large' })
    ).toEqual({ dataset: { theme: 'dark', accent: 'rose', density: 'compact' }, fontSizePx: 16 })
  })

  it('fait l’aller-retour préférences → URL → préférences', () => {
    const s = { ...DEFAULT_SETTINGS, theme: 'dark' as const, accent: 'amber' as const }
    const search = '?' + new URLSearchParams(settingsToQuery(s)).toString()
    expect(settingsFromQuery(search)).toEqual(s)
  })

  it('ignore les valeurs inconnues de l’URL', () => {
    expect(settingsFromQuery('?theme=violet&accent=green')).toEqual({
      ...DEFAULT_SETTINGS,
      accent: 'green'
    })
  })
})
