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

describe('contrat IPC : fidèles', () => {
  const valid = {
    lastName: 'rakoto',
    firstName: 'tiana',
    birthDate: '1985-03-12',
    address: 'Lot II A 45, Ambatondrazaka'
  }

  it('members.create applique les valeurs par défaut', () => {
    expect(ipcInputs['members.create'].parse(valid)).toEqual({
      ...valid,
      phone: null,
      sector: null,
      registrationNumber: null,
      baptized: false,
      communicant: false,
      confirmDuplicate: false
    })
  })

  it('members.create transforme un champ facultatif vide en null', () => {
    const parsed = ipcInputs['members.create'].parse({ ...valid, phone: '', sector: '  ' })
    expect(parsed.phone).toBeNull()
    expect(parsed.sector).toBeNull()
  })

  it('members.create refuse un nom vide, une date mal formée ou un champ inconnu', () => {
    const schema = ipcInputs['members.create']
    expect(schema.safeParse({ ...valid, lastName: '  ' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, address: '' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, birthDate: '12/03/1985' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, inconnu: 1 }).success).toBe(false)
  })

  it('members.update exige un id', () => {
    expect(ipcInputs['members.update'].safeParse(valid).success).toBe(false)
    expect(ipcInputs['members.update'].safeParse({ ...valid, id: 3 }).success).toBe(true)
  })

  it('members.list applique page 1, 50 par page, recherche vide', () => {
    expect(ipcInputs['members.list'].parse({})).toEqual({ search: '', page: 1, pageSize: 50 })
    expect(ipcInputs['members.list'].safeParse({ pageSize: 500 }).success).toBe(false)
  })
})
