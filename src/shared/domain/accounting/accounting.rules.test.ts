import { describe, expect, it } from 'vitest'
import {
  cellOf,
  isDetailed,
  normalizeDescription,
  normalizePrefix,
  operationDateError
} from './accounting.rules'
import {
  addEntryInputSchema,
  createItemInputSchema,
  periodTotalsInputSchema,
  setTotalInputSchema,
  updateEntryInputSchema
} from './accounting.types'

describe('description', () => {
  it('met la description en majuscules au niveau 1 seulement', () => {
    expect(normalizeDescription(1, ' asa iombonana é ')).toBe('ASA IOMBONANA É')
    expect(normalizeDescription(2, ' Mpitandrina ')).toBe('Mpitandrina')
    expect(normalizeDescription(4, 'Akany')).toBe('Akany')
  })

  it('normalise la lettre', () => {
    expect(normalizePrefix(' b ')).toBe('B')
  })
})

describe('cases de montant', () => {
  it('une case vide ou à une saisie sans libellé est simple', () => {
    expect(cellOf([])).toEqual({ total: null, entryCount: 0, detailed: false })
    expect(cellOf([{ amount: 500000, label: null }])).toEqual({
      total: 500000,
      entryCount: 1,
      detailed: false
    })
  })

  it('une case avec libellé ou plusieurs saisies est détaillée et somme ses saisies', () => {
    expect(isDetailed([{ amount: 1000, label: 'Kojakoja' }])).toBe(true)
    expect(
      cellOf([
        { amount: 1000, label: null },
        { amount: 2500, label: null }
      ])
    ).toEqual({ total: 3500, entryCount: 2, detailed: true })
  })
})

describe('saisie (schémas)', () => {
  it('exige une lettre au niveau 1 et l’interdit en dessous', () => {
    expect(createItemInputSchema.safeParse({ parentId: null, description: 'X' }).success).toBe(
      false
    )
    expect(
      createItemInputSchema.parse({ parentId: null, prefix: 'a', description: ' X ' })
    ).toEqual({ parentId: null, prefix: 'A', description: 'X' })
    expect(
      createItemInputSchema.safeParse({ parentId: 1, prefix: 'A', description: 'X' }).success
    ).toBe(false)
    expect(createItemInputSchema.safeParse({ parentId: 1, description: 'X' }).success).toBe(true)
  })

  it('refuse une lettre hors alphabet malgache ou une description vide', () => {
    for (const prefix of ['', '1', 'A1', 'ABCD', 'C', 'Q', 'U', 'W', 'X', 'AC']) {
      expect(
        createItemInputSchema.safeParse({ parentId: null, prefix, description: 'X' }).success
      ).toBe(false)
    }
    expect(createItemInputSchema.safeParse({ parentId: 1, description: '  ' }).success).toBe(false)
  })

  it('refuse un montant négatif ou décimal et un type inconnu', () => {
    const base = { itemId: 1, year: 2026, type: 'actual' }
    expect(setTotalInputSchema.safeParse({ ...base, amount: -1 }).success).toBe(false)
    expect(setTotalInputSchema.safeParse({ ...base, amount: 1.5 }).success).toBe(false)
    expect(setTotalInputSchema.safeParse({ ...base, amount: null }).success).toBe(true)
    expect(setTotalInputSchema.safeParse({ ...base, type: 'other', amount: 1 }).success).toBe(false)
  })

  it('transforme un libellé vide en saisie sans libellé', () => {
    const base = { itemId: 1, year: 2026, type: 'estimate', amount: 10, operatedOn: null }
    expect(addEntryInputSchema.parse({ ...base, label: '   ' }).label).toBeNull()
    expect(addEntryInputSchema.parse({ ...base, label: ' Kojakoja ' }).label).toBe('Kojakoja')
    expect(
      updateEntryInputSchema.parse({ id: 1, amount: 10, label: null, operatedOn: null }).label
    ).toBeNull()
    expect(addEntryInputSchema.safeParse({ ...base, label: 'x'.repeat(121) }).success).toBe(false)
  })

  it('n’accepte qu’une période d’au plus 366 jours, dans l’ordre', () => {
    expect(
      periodTotalsInputSchema.safeParse({ from: '2026-11-23', to: '2026-11-29' }).success
    ).toBe(true)
    expect(
      periodTotalsInputSchema.safeParse({ from: '2026-11-29', to: '2026-11-23' }).success
    ).toBe(false)
    expect(
      periodTotalsInputSchema.safeParse({ from: '2024-01-01', to: '2026-01-01' }).success
    ).toBe(false)
    expect(
      periodTotalsInputSchema.safeParse({ from: '2026-02-30', to: '2026-03-01' }).success
    ).toBe(false)
  })
})

describe('date d’opération', () => {
  it('exige une date dans l’année pour une réalisation, aucune pour une estimation', () => {
    expect(operationDateError('actual', 2026, '2026-03-15')).toBeNull()
    expect(operationDateError('estimate', 2026, null)).toBeNull()
    expect(operationDateError('actual', 2026, null)).toBe(
      'La date de la réalisation doit être en 2026.'
    )
    expect(operationDateError('actual', 2026, '2025-12-31')).toBe(
      'La date de la réalisation doit être en 2026.'
    )
    expect(operationDateError('estimate', 2026, '2026-03-15')).toBe(
      'Une estimation est annuelle : pas de date.'
    )
  })
})
