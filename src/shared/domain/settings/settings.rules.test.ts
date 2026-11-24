import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, resolveSettings, settingsPatchToRows } from './settings.rules'

describe('resolveSettings', () => {
  it('renvoie les valeurs par défaut sans aucune ligne', () => {
    expect(resolveSettings([])).toEqual({ settings: DEFAULT_SETTINGS, invalidKeys: [] })
  })

  it('applique les valeurs stockées valides', () => {
    const { settings } = resolveSettings([
      { key: 'theme', value: '"dark"' },
      { key: 'accent', value: '"green"' }
    ])
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', accent: 'green' })
  })

  it('retombe sur la valeur par défaut pour une valeur corrompue ou obsolète', () => {
    const res = resolveSettings([
      { key: 'theme', value: '{pas du json' },
      { key: 'accent', value: '"violet-supprime"' }
    ])
    expect(res.settings).toEqual(DEFAULT_SETTINGS)
    expect(res.invalidKeys).toEqual(['theme', 'accent'])
  })

  it("ignore les clés inconnues (d'une autre version)", () => {
    const res = resolveSettings([{ key: 'ancienneCle', value: '1' }])
    expect(res).toEqual({ settings: DEFAULT_SETTINGS, invalidKeys: [] })
  })
})

describe('settingsPatchToRows', () => {
  it('sérialise en JSON uniquement les clés présentes', () => {
    expect(settingsPatchToRows({ theme: 'dark', density: undefined })).toEqual([
      { key: 'theme', value: '"dark"' }
    ])
  })
})
