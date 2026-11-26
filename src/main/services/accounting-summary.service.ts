import type { Db } from '@main/db/client'
import type { AccountingSummaryRepository } from '@main/repositories/accounting-summary.repository'
import { columnTarget } from '@shared/domain/accounting/accounting.columns'
import { localInstantRange } from '@shared/domain/accounting/accounting.periods'
import type {
  EnteredTotalsDTO,
  EnteredTotalsInput,
  EntryType,
  PeriodTotalDTO,
  PeriodTotalsInput
} from '@shared/domain/accounting/accounting.types'

/**
 * Totaux par date de saisie (règles du porteur, 2026-11-26), quelle que soit la date d'opération.
 * Synthèse prévu / réalisé : sur une période, chaque ligne est la somme des valeurs saisies
 * pendant la période ; la colonne « Cette année » reprend le total de l'année (tableau), pas ce
 * service. Vues par période : même règle, pour la colonne choisie.
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
    },

    /**
     * Vues Mois, Semaine, Jour, Personnalisé : par élément, somme des saisies de la colonne
     * choisie (N = année du premier jour) faites pendant ces jours locaux.
     */
    getPeriodTotals(input: PeriodTotalsInput): PeriodTotalDTO[] {
      const target = columnTarget(Number(input.from.slice(0, 4)), input.column)
      const instants = localInstantRange(input)
      return deps.db.transaction((tx) =>
        deps.summary.sumEnteredByItem(tx, { ledger: input.ledger, ...target, ...instants })
      )
    }
  }
}

export type AccountingSummaryService = ReturnType<typeof createAccountingSummaryService>
