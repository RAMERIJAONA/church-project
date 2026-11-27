import { and, asc, eq, isNull, max } from 'drizzle-orm'
import type { DbOrTx } from '@main/db/client'
import { households } from '@main/db/schema'

export interface HouseholdRow {
  id: number
  number: number
  sectorId: number
  sponsorId: number | null
  lastChildRank: number
}

const cols = {
  id: households.id,
  number: households.number,
  sectorId: households.sectorId,
  sponsorId: households.sponsorId,
  lastChildRank: households.lastChildRank
}

const active = isNull(households.deletedAt)

/** Accès données des foyers. Les lectures excluent les foyers supprimés. */
export function createHouseholdsRepository() {
  return {
    insert(
      db: DbOrTx,
      row: { number: number; sectorId: number; sponsorId: number | null; createdAt: string }
    ): number {
      return db
        .insert(households)
        .values({ ...row, updatedAt: row.createdAt })
        .returning({ id: households.id })
        .get().id
    },

    findById(db: DbOrTx, id: number): HouseholdRow | null {
      return (
        db
          .select(cols)
          .from(households)
          .where(and(eq(households.id, id), active))
          .get() ?? null
      )
    },

    /** Plus haut numéro, foyers supprimés compris : un numéro n'est jamais réattribué. */
    maxNumber(db: DbOrTx): number | null {
      return (
        db
          .select({ n: max(households.number) })
          .from(households)
          .get()?.n ?? null
      )
    },

    setLastChildRank(db: DbOrTx, id: number, rank: number, at: string): void {
      db.update(households)
        .set({ lastChildRank: rank, updatedAt: at })
        .where(eq(households.id, id))
        .run()
    },

    setSponsor(db: DbOrTx, id: number, sponsorId: number | null, at: string): void {
      db.update(households).set({ sponsorId, updatedAt: at }).where(eq(households.id, id)).run()
    },

    /** Foyers parrainés par ce fidèle repassent « à désigner » (index `households_sponsor_idx`). */
    clearSponsor(db: DbOrTx, memberId: number, at: string): number {
      return db
        .update(households)
        .set({ sponsorId: null, updatedAt: at })
        .where(eq(households.sponsorId, memberId))
        .run().changes
    },

    /** Numéros des foyers actifs parrainés par ce fidèle, croissants. */
    sponsoredNumbers(db: DbOrTx, memberId: number): number[] {
      return db
        .select({ number: households.number })
        .from(households)
        .where(and(eq(households.sponsorId, memberId), active))
        .orderBy(asc(households.number))
        .all()
        .map((r) => r.number)
    }
  }
}

export type HouseholdsRepository = ReturnType<typeof createHouseholdsRepository>
