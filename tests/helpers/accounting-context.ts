/**
 * Contexte de test du service de comptabilité : SQLite en mémoire avec les migrations réelles,
 * horloge figée au 2026-11-24 09:00 UTC, et le plan de l'église en exemple.
 */
import { expect } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createAccountingSummaryRepository } from '@main/repositories/accounting-summary.repository'
import { createAccountingRepository } from '@main/repositories/accounting.repository'
import { createAccountingSummaryService } from '@main/services/accounting-summary.service'
import { createAccountingService } from '@main/services/accounting.service'
import { findItem } from '@shared/domain/accounting/accounting.tree'
import type { AccountingItemDTO } from '@shared/domain/accounting/accounting.types'
import { AppError } from '@shared/domain/errors'
import { makeChildInput, makeRootInput } from '@tests/factories/accounting.factory'
import { createTestDb } from './test-db'

export const YEAR = 2026
export const T9 = '2026-11-24T09:00:00.000Z'
export const T10 = '2026-11-24T10:00:00.000Z'
/** Date d'opération : jour local de T9 (pas de bascule de date sous nos fuseaux) */
export const D = '2026-11-24'
/** Case « Réalisation 2026 » */
export const cell = { year: YEAR, type: 'actual' } as const

export function setupAccounting() {
  const handle = createTestDb()
  const clock = createFixedClock(new Date(T9))
  const service = createAccountingService({
    db: handle.db,
    accounting: createAccountingRepository(),
    clock,
    logger: createLogger(createMemorySink())
  })
  // Totaux par date de saisie : synthèse et vues par période
  const totals = createAccountingSummaryService({
    db: handle.db,
    summary: createAccountingSummaryRepository()
  })
  const codes = (year = YEAR): string[] => {
    const out: string[] = []
    const walk = (items: AccountingItemDTO[]): void =>
      items.forEach((i) => {
        out.push(i.code)
        walk(i.children)
      })
    walk(service.getSheet(year).items)
    return out
  }
  const item = (id: number, year = YEAR) => findItem(service.getSheet(year), id)
  const child = (parentId: number, description = 'Sous-rubrique') =>
    service.createItem(makeChildInput({ parentId, description }))
  /** F1 ANATINY > {I > 1, II > 1 > {A), B)}} */
  const church = () => {
    for (const prefix of ['A', 'B', 'D', 'E']) service.createItem(makeRootInput({ prefix }))
    const f1 = service.createItem(makeRootInput({ prefix: 'F', description: 'anatiny' }))
    const i = child(f1.id, 'Mpitandrina')
    const i1 = child(i.id, 'Karama')
    const ii = child(f1.id, 'Trano Fiangonana')
    const ii1 = child(ii.id, 'Fanatsarana')
    const a = child(ii1.id, 'Trano Fiangonana (Kojakoja)')
    const b = child(ii1.id, 'Akany')
    return { f1, i, i1, ii, ii1, a, b }
  }
  return { handle, clock, service, totals, codes, item, child, church }
}

export const expectAppError = (fn: () => unknown, code: string): void => {
  try {
    fn()
  } catch (err) {
    expect(err).toBeInstanceOf(AppError)
    expect((err as AppError).code).toBe(code)
    return
  }
  throw new Error('AppError attendue')
}
