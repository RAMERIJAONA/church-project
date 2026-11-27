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

  it('traite une recherche faite de ponctuation comme pas de recherche', () => {
    expect(resultLabel(120, ' - ')).toBe('120 fidèles')
  })

  it('compte les résultats d’une recherche', () => {
    expect(resultLabel(1, 'rakto')).toBe('1 résultat pour « rakto »')
    expect(resultLabel(3, ' rakto ')).toBe('3 résultats pour « rakto »')
  })
})

describe('conflictDetails', () => {
  it('lit le détail d’un conflit de fidèle', () => {
    const existing = makeMemberDTO()
    const err = new IpcError('CONFLICT', 'existe déjà', { reason: 'name-taken', existing })
    expect(conflictDetails(err)).toEqual({ reason: 'name-taken', existing })
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

  it('affiche en tête un rang déjà pris dans le foyer', () => {
    const message = 'Ce foyer a déjà un rang 1 (Père ou Chef de foyer) : RAKOTO Jean.'
    const err = new IpcError('CONFLICT', message, {
      reason: 'rank-taken',
      existing: makeMemberDTO()
    })
    expect(serverErrorOf(err)).toEqual({ message })
  })

  it('place un nom et prénom déjà pris sous le prénom', () => {
    const message = 'Un fidèle RAKOTO Tiana existe déjà (né le 12/03/1985, matricule M-0042).'
    const err = new IpcError('CONFLICT', message, {
      reason: 'name-taken',
      existing: makeMemberDTO()
    })
    expect(serverErrorOf(err)).toEqual({ field: 'firstName', message })
  })

  it('garde le message d’une règle métier, sans champ', () => {
    const err = new IpcError('BUSINESS_RULE', 'Un membre communiant est toujours baptisé.')
    expect(serverErrorOf(err)).toEqual({ message: 'Un membre communiant est toujours baptisé.' })
  })

  it('affiche le message générique d’une erreur inattendue', () => {
    expect(serverErrorOf(new Error('boom')).message).toMatch(/erreur inattendue/)
  })
})
