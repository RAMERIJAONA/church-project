import type { Db } from '@main/db/client'
import type { AccountingSummaryRepository } from '@main/repositories/accounting-summary.repository'
import type {
  EnteredTotalsDTO,
  EnteredTotalsInput,
  EntryType
} from '@shared/domain/accounting/accounting.types'

/**
 * Synthèse prévu / réalisé (règle du porteur, 2026-11-26) : sur une période, chaque ligne est
 * la somme des valeurs saisies pendant la période (date de saisie), quelle que soit leur date
 * d'opération. La colonne « Cette année » reprend le total de l'année (tableau), pas ce service.
 */
export function createAccountingSummaryService(deps: {
  db: Db
  summary: AccountingSummaryRepository
}) {
  return {
    getEnteredTotals(input: EnteredTotalsInput): EnteredTotalsDTO {
      const rows = deps.db.transaction((tx) =>
        deps.summary.sumEnteredBetween(tx, { ...input, years: [input.year, input.year + 1] })
      )
      const total = (year: number, type: EntryType): number | null =>
        rows.find((r) => r.year === year && r.type === type)?.total ?? null
      return {
        estimate: total(input.year, 'estimate'),
        actual: total(input.year, 'actual'),
        nextEstimate: total(input.year + 1, 'estimate')
      }
    }
  }
}

export type AccountingSummaryService = ReturnType<typeof createAccountingSummaryService>
