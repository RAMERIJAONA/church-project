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
    householdId: 1,
    role: 'child',
    sex: 'F',
    lastName: 'rakoto',
    firstName: 'tiana',
    birthDate: '1985-03-12',
    address: 'Lot II A 45, Ambatondrazaka'
  }

  it('members.create applique les valeurs par défaut', () => {
    expect(ipcInputs['members.create'].parse(valid)).toEqual({
      ...valid,
      phone: null,
      baptized: false,
      communicant: false,
      deacon: false
    })
  })

  it('members.create transforme un téléphone vide en null', () => {
    expect(ipcInputs['members.create'].parse({ ...valid, phone: '  ' }).phone).toBeNull()
  })

  it('members.create refuse un nom vide, une date mal formée, un rôle ou un sexe inconnu', () => {
    const schema = ipcInputs['members.create']
    expect(schema.safeParse({ ...valid, lastName: '  ' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, address: '' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, birthDate: '12/03/1985' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, role: 'uncle' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, sex: 'X' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, inconnu: 1 }).success).toBe(false)
    // Le matricule n'est jamais saisi
    expect(schema.safeParse({ ...valid, registrationNumber: 'M-1' }).success).toBe(false)
  })

  it('members.update exige un id et ne change pas de foyer', () => {
    const fields = Object.fromEntries(Object.entries(valid).filter(([k]) => k !== 'householdId'))
    expect(ipcInputs['members.update'].safeParse(fields).success).toBe(false)
    expect(ipcInputs['members.update'].safeParse({ ...fields, id: 3 }).success).toBe(true)
    expect(ipcInputs['members.update'].safeParse({ ...valid, id: 3 }).success).toBe(false)
  })

  it('members.list applique page 1, 50 par page, recherche vide', () => {
    expect(ipcInputs['members.list'].parse({})).toEqual({
      search: '',
      page: 1,
      pageSize: 50,
      sort: 'name',
      order: 'asc'
    })
    expect(ipcInputs['members.list'].safeParse({ pageSize: 500 }).success).toBe(false)
  })
})

describe('contrat IPC : déplacement retiré (porteur, 2026-11-27)', () => {
  it('ne propose plus de déplacer un fidèle vers un autre foyer', () => {
    expect(CHANNELS).not.toContain('members.move')
  })
})
