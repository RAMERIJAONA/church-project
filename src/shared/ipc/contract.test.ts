import { describe, expect, it } from 'vitest'
import { CHANNELS, isChannel } from './channels'
import { ipcInputs } from './contract'

describe('contrat IPC', () => {
  it('définit un schéma pour chaque canal de la liste blanche', () => {
    expect(Object.keys(ipcInputs).sort()).toEqual([...CHANNELS].sort())
  })

  it('isChannel refuse un canal inconnu', () => {
    expect(isChannel('settings.get')).toBe(true)
    expect(isChannel('fs.readFile')).toBe(false)
    expect(isChannel(42)).toBe(false)
  })

  it('settings.update accepte un patch partiel valide', () => {
    expect(ipcInputs['settings.update'].safeParse({ theme: 'dark' }).success).toBe(true)
  })

  it('settings.update refuse une valeur hors liste ou une clé inconnue', () => {
    expect(ipcInputs['settings.update'].safeParse({ theme: 'violet' }).success).toBe(false)
    expect(ipcInputs['settings.update'].safeParse({ inconnue: true }).success).toBe(false)
  })

  it('les canaux sans entrée refusent un argument', () => {
    expect(ipcInputs['settings.get'].safeParse(undefined).success).toBe(true)
    expect(ipcInputs['settings.get'].safeParse({ x: 1 }).success).toBe(false)
  })
})
