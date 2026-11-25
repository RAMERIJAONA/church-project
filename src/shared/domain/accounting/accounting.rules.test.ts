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
    expect(cellOf([])).toEqual({ total: null, entryCount: 0, detailed: false, lastEntryAt: null })
    expect(
      cellOf([{ amount: 500000, label: null, updatedAt: '2026-11-20T08:00:00.000Z' }])
    ).toEqual({
      total: 500000,
      entryCount: 1,
      detailed: false,
      lastEntryAt: '2026-11-20T08:00:00.000Z'
    })
  })

  it('une case avec libellé ou plusieurs saisies est détaillée et somme ses saisies', () => {
    expect(isDetailed([{ amount: 1000, label: 'Kojakoja' }])).toBe(true)
    expect(
      cellOf([
        { amount: 1000, label: null, updatedAt: '2026-11-25T11:32:00.000Z' },
        { amount: 2500, label: null, updatedAt: '2026-11-20T08:00:00.000Z' }
      ])
    ).toEqual({
      total: 3500,
      entryCount: 2,
      detailed: true,
      lastEntryAt: '2026-11-25T11:32:00.000Z'
    })
  })

  it('date de la case : la plus récente saisie ou modification', () => {
    expect(
      cellOf([
        { amount: 1, label: null, updatedAt: '2026-11-20T08:00:00.000Z' },
        { amount: 2, label: null, updatedAt: '2026-11-25T11:32:00.000Z' }
      ]).lastEntryAt
    ).toBe('2026-11-25T11:32:00.000Z')
  })
})

describe('saisie (schémas)', () => {
  it('exige une lettre au niveau 1 et l’interdit en dessous', () => {
    expect(createItemInputSchema.safeParse({ parentId: null, description: 'X' }).success).toBe(
      false
    )
    expect(
      createItemInputSchema.parse({
        parentId: null,
        prefix: 'a',
        ledger: 'expense',
        description: ' X '
      })
    ).toEqual({ parentId: null, prefix: 'A', ledger: 'expense', description: 'X' })
    expect(
      createItemInputSchema.safeParse({ parentId: 1, prefix: 'A', description: 'X' }).success
    ).toBe(false)
    expect(createItemInputSchema.safeParse({ parentId: 1, description: 'X' }).success).toBe(true)
  })

  it('refuse une lettre hors alphabet malgache ou une description vide', () => {
    for (const prefix of ['', '1', 'A1', 'ABCD', 'C', 'Q', 'U', 'W', 'X', 'AC']) {
      expect(
        createItemInputSchema.safeParse({
          parentId: null,
          prefix,
          ledger: 'expense',
          description: 'X'
        }).success
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

  it('accepte une période de n’importe quelle durée, dans l’ordre', () => {
    const ok = (from: string, to: string): boolean =>
      periodTotalsInputSchema.safeParse({ from, to, ledger: 'expense' }).success
    expect(ok('2026-11-23', '2026-11-29')).toBe(true)
    expect(ok('2024-01-01', '2026-12-31')).toBe(true) // plusieurs années
    expect(ok('2026-11-24', '2026-11-24')).toBe(true)
    expect(ok('2026-11-29', '2026-11-23')).toBe(false)
    expect(ok('2026-02-30', '2026-03-01')).toBe(false)
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
