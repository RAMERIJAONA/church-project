import { describe, expect, it } from 'vitest'
import { nextNumber, normalizeSectorName } from './sectors.rules'

describe('nom de secteur', () => {
  it('met une majuscule au début de chaque mot', () => {
    expect(normalizeSectorName('  aMBODImanga ')).toBe('Ambodimanga')
    expect(normalizeSectorName('ambohitsara   avaratra')).toBe('Ambohitsara Avaratra')
  })
})

describe('numéro suivant', () => {
  it('commence à 1 et suit le plus haut', () => {
    expect(nextNumber(null)).toBe(1)
    expect(nextNumber(4)).toBe(5)
  })
})
