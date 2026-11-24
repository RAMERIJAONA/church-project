import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createAccountingRepository } from '@main/repositories/accounting.repository'
import { createAccountingService } from '@main/services/accounting.service'
import { AppError } from '@shared/domain/errors'
import { makeLineInput, makeSectionInput } from '@tests/factories/accounting.factory'
import { createTestDb } from '@tests/helpers/test-db'

const YEAR = 2026

function setup() {
  const handle = createTestDb()
  const clock = createFixedClock(new Date('2026-11-24T09:00:00.000Z'))
  const service = createAccountingService({
    db: handle.db,
    accounting: createAccountingRepository(),
    clock,
    logger: createLogger(createMemorySink())
  })
  const codes = (year = YEAR) =>
    service.getSheet(year).sections.map((s) => [s.code, ...s.lines.map((l) => l.code)])
  return { handle, clock, service, codes }
}

const expectAppError = (fn: () => unknown, code: string): void => {
  try {
    fn()
  } catch (err) {
    expect(err).toBeInstanceOf(AppError)
    expect((err as AppError).code).toBe(code)
    return
  }
  throw new Error('AppError attendue')
}

describe('AccountingService', () => {
  it('renvoie un tableau vide sur une base neuve', () => {
    expect(setup().service.getSheet(YEAR)).toEqual({ year: YEAR, sections: [] })
  })

  it('numérote rubriques et lignes automatiquement (exemple A1 - ASA IOMBONANA)', () => {
    const { service } = setup()
    const a1 = service.createSection(
      makeSectionInput({ prefix: 'a', description: 'ASA IOMBONANA' })
    )
    expect(a1.code).toBe('A1')
    const l1 = service.createLine(
      makeLineInput({ sectionId: a1.id, description: 'Kitapo iombonana', amount: 7654321 })
    )
    const l2 = service.createLine(makeLineInput({ sectionId: a1.id, description: 'KTM - Adidy' }))
    expect([l1.code, l2.code]).toEqual(['A1-1', 'A1-2'])
    expect(service.createSection(makeSectionInput({ prefix: 'A' })).code).toBe('A2')
    expect(service.createSection(makeSectionInput({ prefix: 'B' })).code).toBe('B1')

    const sheet = service.getSheet(YEAR)
    expect(sheet.sections[0]).toMatchObject({
      code: 'A1',
      prefix: 'A',
      description: 'ASA IOMBONANA'
    })
    expect(sheet.sections[0]?.lines).toEqual([
      { id: l1.id, code: 'A1-1', description: 'Kitapo iombonana', amount: 7654321 },
      { id: l2.id, code: 'A1-2', description: 'KTM - Adidy', amount: null }
    ])
  })

  it('garde un montant par année, indépendant des autres années', () => {
    const { service } = setup()
    const a1 = service.createSection(makeSectionInput())
    const line = service.createLine(makeLineInput({ sectionId: a1.id, amount: 100, year: 2025 }))
    service.setAmount({ lineId: line.id, year: YEAR, amount: 250 })
    service.setAmount({ lineId: line.id, year: YEAR, amount: 300 })

    expect(service.getSheet(2025).sections[0]?.lines[0]?.amount).toBe(100)
    expect(service.getSheet(YEAR).sections[0]?.lines[0]?.amount).toBe(300)
    expect(service.getSheet(2027).sections[0]?.lines[0]?.amount).toBeNull()

    service.setAmount({ lineId: line.id, year: YEAR, amount: null })
    expect(service.getSheet(YEAR).sections[0]?.lines[0]?.amount).toBeNull()
    expect(service.getSheet(2025).sections[0]?.lines[0]?.amount).toBe(100)
  })

  it('renumérote sans trou après suppression d’une ligne, montants conservés', () => {
    const { service, codes } = setup()
    const a1 = service.createSection(makeSectionInput())
    const ids = [1, 2, 3].map(
      (n) => service.createLine(makeLineInput({ sectionId: a1.id, amount: n * 10 })).id
    )
    service.deleteLine(ids[1]!)
    expect(codes()).toEqual([['A1', 'A1-1', 'A1-2']])
    expect(service.getSheet(YEAR).sections[0]?.lines.map((l) => l.amount)).toEqual([10, 30])
    // La ligne suivante reprend le numéro libre
    expect(service.createLine(makeLineInput({ sectionId: a1.id })).code).toBe('A1-3')
  })

  it('supprime une rubrique avec ses lignes et renumérote les suivantes', () => {
    const { service, codes, handle } = setup()
    const a1 = service.createSection(makeSectionInput())
    service.createLine(makeLineInput({ sectionId: a1.id }))
    const a2 = service.createSection(makeSectionInput())
    service.createLine(makeLineInput({ sectionId: a2.id }))
    service.deleteSection(a1.id)
    expect(codes()).toEqual([['A1', 'A1-1']])
    expect(service.getSheet(YEAR).sections[0]?.id).toBe(a2.id)
    // Suppression douce : rien n'est effacé physiquement
    const deleted = handle.sqlite
      .prepare('SELECT COUNT(*) FROM accounting_lines WHERE deleted_at IS NOT NULL')
      .pluck()
      .get()
    expect(deleted).toBe(1)
    expectAppError(() => service.createLine(makeLineInput({ sectionId: a1.id })), 'NOT_FOUND')
  })

  it('déplace une ligne vers le haut ou le bas (les numéros suivent l’ordre)', () => {
    const { service } = setup()
    const a1 = service.createSection(makeSectionInput())
    const first = service.createLine(makeLineInput({ sectionId: a1.id, description: 'Un' }))
    service.createLine(makeLineInput({ sectionId: a1.id, description: 'Deux' }))
    const third = service.createLine(makeLineInput({ sectionId: a1.id, description: 'Trois' }))

    expect(service.moveLine(third.id, 'up')).toEqual({ moved: true })
    const order = () => service.getSheet(YEAR).sections[0]?.lines.map((l) => l.description)
    expect(order()).toEqual(['Un', 'Trois', 'Deux'])
    expect(service.moveLine(first.id, 'up')).toEqual({ moved: false })
    expect(service.moveLine(first.id, 'down')).toEqual({ moved: true })
    expect(order()).toEqual(['Trois', 'Un', 'Deux'])
  })

  it('déplace une rubrique au sein de sa lettre uniquement', () => {
    const { service, codes } = setup()
    const a1 = service.createSection(makeSectionInput({ description: 'Premier' }))
    service.createSection(makeSectionInput({ prefix: 'B' }))
    const a2 = service.createSection(makeSectionInput({ description: 'Second' }))

    expect(service.moveSection(a2.id, 'up')).toEqual({ moved: true })
    const sheet = service.getSheet(YEAR)
    expect(sheet.sections.map((s) => [s.code, s.description])).toEqual([
      ['A1', 'SECOND'],
      ['A2', 'PREMIER'],
      ['B1', 'RUBRIQUE']
    ])
    expect(service.moveSection(a1.id, 'down')).toEqual({ moved: false })
    expect(codes()).toHaveLength(3)
  })

  it('modifie les descriptions et horodate avec l’horloge injectée', () => {
    const { service, clock, handle } = setup()
    const a1 = service.createSection(makeSectionInput())
    const line = service.createLine(makeLineInput({ sectionId: a1.id }))
    clock.set(new Date('2026-12-01T08:00:00.000Z'))
    service.updateSection(a1.id, 'ASA IOMBONANA')
    service.updateLine(line.id, 'Kitapo iombonana')
    const sheet = service.getSheet(YEAR)
    expect(sheet.sections[0]?.description).toBe('ASA IOMBONANA')
    expect(sheet.sections[0]?.lines[0]?.description).toBe('Kitapo iombonana')
    const updatedAt = handle.sqlite
      .prepare('SELECT updated_at FROM accounting_lines WHERE id = ?')
      .pluck()
      .get(line.id)
    expect(updatedAt).toBe('2026-12-01T08:00:00.000Z')
  })

  it('refuse d’agir sur un élément inexistant ou supprimé', () => {
    const { service } = setup()
    expectAppError(() => service.updateSection(999, 'X'), 'NOT_FOUND')
    expectAppError(() => service.setAmount({ lineId: 999, year: YEAR, amount: 1 }), 'NOT_FOUND')
    const a1 = service.createSection(makeSectionInput())
    const line = service.createLine(makeLineInput({ sectionId: a1.id }))
    service.deleteLine(line.id)
    expectAppError(() => service.setAmount({ lineId: line.id, year: YEAR, amount: 1 }), 'NOT_FOUND')
    expectAppError(() => service.moveLine(line.id, 'up'), 'NOT_FOUND')
    expectAppError(() => service.deleteSection(999), 'NOT_FOUND')
  })

  it('la base refuse un montant négatif ou une lettre invalide (garde-fou SQL)', () => {
    const { handle, service } = setup()
    const a1 = service.createSection(makeSectionInput())
    const line = service.createLine(makeLineInput({ sectionId: a1.id }))
    const at = '2026-11-24T09:00:00.000Z'
    expect(() =>
      handle.sqlite
        .prepare(
          'INSERT INTO accounting_amounts (line_id, year, amount, updated_at) VALUES (?, ?, ?, ?)'
        )
        .run(line.id, YEAR, -5, at)
    ).toThrow(/CHECK/)
    expect(() =>
      handle.sqlite
        .prepare(
          'INSERT INTO accounting_sections (prefix, position, description, created_at, updated_at) VALUES (?, 1, ?, ?, ?)'
        )
        .run('A1', 'X', at, at)
    ).toThrow(/CHECK/)
    // Lettre absente de l'alphabet malgache
    expect(() =>
      handle.sqlite
        .prepare(
          'INSERT INTO accounting_sections (prefix, position, description, created_at, updated_at) VALUES (?, 1, ?, ?, ?)'
        )
        .run('C', 'X', at, at)
    ).toThrow(/CHECK/)
  })

  it('attribue les lettres dans l’ordre malgache : lettre existante ou suivante uniquement', () => {
    const { service, codes } = setup()
    // Tableau vide : seule A est possible
    expectAppError(() => service.createSection(makeSectionInput({ prefix: 'B' })), 'BUSINESS_RULE')
    service.createSection(makeSectionInput({ prefix: 'A' }))
    expect(service.createSection(makeSectionInput({ prefix: 'B' })).code).toBe('B1')
    // Après B vient D (pas de C en malgache) ; sauter une lettre est refusé
    expectAppError(() => service.createSection(makeSectionInput({ prefix: 'C' })), 'BUSINESS_RULE')
    expectAppError(() => service.createSection(makeSectionInput({ prefix: 'E' })), 'BUSINESS_RULE')
    expect(service.createSection(makeSectionInput({ prefix: 'D' })).code).toBe('D1')
    // Une lettre déjà utilisée reste disponible
    expect(service.createSection(makeSectionInput({ prefix: 'A' })).code).toBe('A2')
    expect(codes().map((c) => c[0])).toEqual(['A1', 'A2', 'B1', 'D1'])
  })

  it('enregistre toujours la description d’une rubrique en majuscules', () => {
    const { service } = setup()
    const a1 = service.createSection(makeSectionInput({ description: ' asa iombonana ' }))
    expect(service.getSheet(YEAR).sections[0]?.description).toBe('ASA IOMBONANA')
    service.updateSection(a1.id, 'fanampiana é')
    expect(service.getSheet(YEAR).sections[0]?.description).toBe('FANAMPIANA É')
    // Les lignes gardent la casse saisie
    service.createLine(makeLineInput({ sectionId: a1.id, description: 'Kitapo iombonana' }))
    expect(service.getSheet(YEAR).sections[0]?.lines[0]?.description).toBe('Kitapo iombonana')
  })
})
