import { describe, expect, it } from 'vitest'
import {
  birthDateError,
  communicantError,
  formatBirthDate,
  formatPhone,
  formatPhoneTyping,
  memberDisplayName,
  normalizeFirstName,
  normalizeLastName,
  parsePhone
} from './members.rules'

describe('nom et prénom', () => {
  it('met le nom en majuscules', () => {
    expect(normalizeLastName('  rakoto  ')).toBe('RAKOTO')
    expect(normalizeLastName('rasoa  nirina')).toBe('RASOA NIRINA')
    expect(normalizeLastName('andrièna')).toBe('ANDRIÈNA')
  })

  it('met une majuscule à chaque mot du prénom', () => {
    expect(normalizeFirstName('rakoto tiana')).toBe('Rakoto Tiana')
    expect(normalizeFirstName('rAkoto TiaNa')).toBe('Rakoto Tiana')
    expect(normalizeFirstName('  jean-pierre   ny  aina ')).toBe('Jean-Pierre Ny Aina')
    expect(normalizeFirstName("marie-o'neil")).toBe("Marie-O'Neil")
  })

  it('affiche « NOM Prénom »', () => {
    expect(memberDisplayName({ lastName: 'RAKOTO', firstName: 'Tiana' })).toBe('RAKOTO Tiana')
  })
})

describe('téléphone', () => {
  it.each([
    ['034 12 345 67', '+261341234567'],
    ['+261 34 12 345 67', '+261341234567'],
    ['261341234567', '+261341234567'],
    ['341234567', '+261341234567'],
    ['034.12.345.67', '+261341234567'],
    ['034-12-345-67', '+261341234567'],
    ['020 22 123 45', '+261202212345'],
    ['+261 034 12 345 67', '+261341234567'],
    ['00261 34 12 345 67', '+261341234567']
  ])('accepte %s', (input, value) => {
    expect(parsePhone(input)).toEqual({ ok: true, value })
  })

  it.each(['034 12 345', '044 12 345 67', '034 12 345 678', 'abc', '+33 6 12 34 56 78'])(
    'refuse %s',
    (input) => {
      expect(parsePhone(input)).toEqual({ ok: false })
    }
  )

  it('considère un téléphone vide comme absent', () => {
    expect(parsePhone('  ')).toEqual({ ok: true, value: null })
  })

  it('affiche 034 12 345 67', () => {
    expect(formatPhone('+261341234567')).toBe('034 12 345 67')
    expect(formatPhone('+261202212345')).toBe('020 22 123 45')
  })

  it('groupe les chiffres pendant la frappe', () => {
    expect(formatPhoneTyping('')).toBe('')
    expect(formatPhoneTyping('034')).toBe('034')
    expect(formatPhoneTyping('03412')).toBe('034 12')
    expect(formatPhoneTyping('+26134123')).toBe('034 12 3')
    expect(formatPhoneTyping('03412345678999')).toBe('034 12 345 67')
    expect(formatPhoneTyping('341234567')).toBe('034 12 345 67')
    expect(formatPhoneTyping('034 12 345 67')).toBe('034 12 345 67')
    expect(formatPhoneTyping('+261 034 12 345 67')).toBe('034 12 345 67')
    expect(formatPhoneTyping('00261341234567')).toBe('034 12 345 67')
  })
})

describe('date de naissance', () => {
  const today = '2026-11-27'

  it('accepte une date passée ou aujourd’hui', () => {
    expect(birthDateError('1985-03-12', today)).toBeNull()
    expect(birthDateError(today, today)).toBeNull()
    expect(birthDateError('1900-01-01', today)).toBeNull()
  })

  it('refuse une date dans le futur', () => {
    expect(birthDateError('2026-11-28', today)).toBe(
      'La date de naissance ne peut pas être dans le futur.'
    )
  })

  it('refuse une date avant 1900', () => {
    expect(birthDateError('1899-12-31', today)).toBe(
      'La date de naissance ne peut pas être avant 1900.'
    )
  })

  it('refuse une date qui n’existe pas', () => {
    expect(birthDateError('2026-02-30', today)).toBe('Date de naissance invalide.')
    expect(birthDateError('12/03/1985', today)).toBe('Date de naissance invalide.')
  })

  it('affiche la date en jj/mm/aaaa', () => {
    expect(formatBirthDate('1985-03-12')).toBe('12/03/1985')
  })
})

describe('membre communiant', () => {
  it('refuse un communiant non baptisé', () => {
    expect(communicantError(false, true)).toBe('Un membre communiant est toujours baptisé.')
  })

  it('accepte les autres combinaisons', () => {
    expect(communicantError(true, true)).toBeNull()
    expect(communicantError(true, false)).toBeNull()
    expect(communicantError(false, false)).toBeNull()
  })
})
