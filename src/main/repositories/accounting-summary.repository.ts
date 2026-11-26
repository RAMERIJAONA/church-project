import { and, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm'
import type { DbOrTx } from '@main/db/client'
import { accountingEntries, accountingItems } from '@main/db/schema'
import type { EntryType, Ledger, PeriodTotalDTO } from '@shared/domain/accounting/accounting.types'

/** Requêtes par date de saisie : synthèse prévu / réalisé et vues par période. */
export function createAccountingSummaryRepository() {
  const t = accountingItems
  const e = accountingEntries
  return {
    /**
     * Somme des saisies actives d'éléments actifs d'une comptabilité, par année et type, faites
     * entre deux instants (`from` inclus, `to` exclu, ISO 8601 UTC comparés en texte).
     */
    sumEnteredBetween(
      db: DbOrTx,
      input: { ledger: Ledger; years: number[]; from: string; to: string }
    ): { year: number; type: EntryType; total: number }[] {
      return db
        .select({ year: e.year, type: e.type, total: sql<number>`sum(${e.amount})` })
        .from(e)
        .innerJoin(t, eq(t.id, e.itemId))
        .where(
          and(
            inArray(e.year, input.years),
            isNull(e.deletedAt),
            isNull(t.deletedAt),
            eq(t.ledger, input.ledger),
            gte(e.createdAt, input.from),
            lt(e.createdAt, input.to)
          )
        )
        .groupBy(e.year, e.type)
        .all()
    },

    /** Vues par période : même filtre, une année et un type, par élément. */
    sumEnteredByItem(
      db: DbOrTx,
      input: { ledger: Ledger; year: number; type: EntryType; from: string; to: string }
    ): PeriodTotalDTO[] {
      return db
        .select({
          itemId: e.itemId,
          total: sql<number>`sum(${e.amount})`,
          entryCount: sql<number>`count(*)`
        })
        .from(e)
        .innerJoin(t, eq(t.id, e.itemId))
        .where(
          and(
            eq(e.year, input.year),
            eq(e.type, input.type),
            isNull(e.deletedAt),
            isNull(t.deletedAt),
            eq(t.ledger, input.ledger),
            gte(e.createdAt, input.from),
            lt(e.createdAt, input.to)
          )
        )
        .groupBy(e.itemId)
        .all()
    }
  }
}

export type AccountingSummaryRepository = ReturnType<typeof createAccountingSummaryRepository>
