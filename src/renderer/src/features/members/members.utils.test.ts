import { describe, expect, it } from 'vitest'
import { IpcError } from '@renderer/lib/ipc-client'
import { makeMemberDTO } from '@tests/factories/members.factory'
import { clampPage, conflictDetails, pageCount, resultLabel, serverErrorOf } from './members.utils'

describe('pagination', () => {
  it('compte au moins une page', () => {
    expect(pageCount(0, 50)).toBe(1)
    expect(pageCount(50, 50)).toBe(1)
    expect(pageCount(51, 50)).toBe(2)
  })

  it('ramène la page sur la dernière qui existe', () => {
    expect(clampPage(3, 100, 50)).toBe(2)
    expect(clampPage(2, 100, 50)).toBe(2)
    expect(clampPage(1, 0, 50)).toBe(1)
  })
})

describe('resultLabel', () => {
  it('compte les fidèles sans recherche', () => {
    expect(resultLabel(1, '')).toBe('1 fidèle')
    expect(resultLabel(12, '')).toBe('12 fidèles')
    expect(resultLabel(1248, '')).toBe(`${(1248).toLocaleString('fr-FR')} fidèles`)
  })

  it('compte les résultats d’une recherche', () => {
    expect(resultLabel(1, 'rakto')).toBe('1 résultat pour « rakto »')
    expect(resultLabel(3, ' rakto ')).toBe('3 résultats pour « rakto »')
  })
})

describe('conflictDetails', () => {
  it('lit le détail d’un conflit de fidèle', () => {
    const existing = makeMemberDTO()
    const err = new IpcError('CONFLICT', 'existe déjà', { reason: 'possible-duplicate', existing })
    expect(conflictDetails(err)).toEqual({ reason: 'possible-duplicate', existing })
  })

  it('ignore les autres erreurs', () => {
    expect(conflictDetails(new IpcError('VALIDATION', 'x', { field: 'phone' }))).toBeNull()
    expect(conflictDetails(new IpcError('CONFLICT', 'x', { reason: 'autre' }))).toBeNull()
    expect(conflictDetails(new Error('x'))).toBeNull()
  })
})

describe('serverErrorOf', () => {
  it('place une erreur de champ sous le champ', () => {
    const err = new IpcError('VALIDATION', 'La date de naissance ne peut pas être dans le futur.', {
      field: 'birthDate'
    })
    expect(serverErrorOf(err)).toEqual({
      field: 'birthDate',
      message: 'La date de naissance ne peut pas être dans le futur.'
    })
  })

  it('place un matricule déjà attribué sous le matricule', () => {
    const err = new IpcError('CONFLICT', 'Le matricule M-1 est déjà attribué à RAKOTO Tiana.', {
      reason: 'registration-number-taken',
      existing: makeMemberDTO()
    })
    expect(serverErrorOf(err)).toEqual({
      field: 'registrationNumber',
      message: 'Le matricule M-1 est déjà attribué à RAKOTO Tiana.'
    })
  })

  it('garde le message d’une règle métier, sans champ', () => {
    const err = new IpcError('BUSINESS_RULE', 'Un membre communiant est toujours baptisé.')
    expect(serverErrorOf(err)).toEqual({ message: 'Un membre communiant est toujours baptisé.' })
  })

  it('affiche le message générique d’une erreur inattendue', () => {
    expect(serverErrorOf(new Error('boom')).message).toMatch(/erreur inattendue/)
  })
})
