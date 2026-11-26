import { and, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm'
import type { DbOrTx } from '@main/db/client'
import { accountingEntries, accountingItems } from '@main/db/schema'
import type { EntryType, Ledger } from '@shared/domain/accounting/accounting.types'

/** Requêtes de la synthèse prévu / réalisé (par date de saisie). */
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
    }
  }
}

export type AccountingSummaryRepository = ReturnType<typeof createAccountingSummaryRepository>
