import { and, asc, count, eq, inArray, isNull, max, sql, type SQL } from 'drizzle-orm'
import type { DbOrTx } from '@main/db/client'
import { households, sectors } from '@main/db/schema'

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

/** Ligne de la liste : foyer, son secteur, compteurs (parrain résolu par le service). */
export interface HouseholdSummaryRow extends HouseholdRow {
  sectorNumber: number
  sectorName: string
  memberCount: number
  mainName: string | null
}

export interface HouseholdFilters {
  sectorId?: number
  sponsorMissing?: boolean
  number?: number
  /** Seulement ces foyers (recherche par nom d'un membre) */
  ids?: readonly number[]
}

/**
 * Membres actifs, et nom et prénom du plus petit rang : chef de foyer ou père, sinon mère, sinon
 * premier enfant (porteur, 2026-11-27 ; index `members_rank_unique_idx`).
 */
const memberCount = sql<number>`(SELECT count(*) FROM members m
  WHERE m.household_id = "households"."id" AND m.deleted_at IS NULL)`
const mainName = sql<string | null>`(SELECT m.last_name || ' ' || m.first_name FROM members m
  WHERE m.household_id = "households"."id" AND m.deleted_at IS NULL ORDER BY m.rank LIMIT 1)`

const summaryCols = {
  ...cols,
  sectorNumber: sectors.number,
  sectorName: sectors.name,
  memberCount,
  mainName
}

function where(f: HouseholdFilters): SQL | undefined {
  return and(
    active,
    f.sectorId === undefined ? undefined : eq(households.sectorId, f.sectorId),
    f.sponsorMissing ? isNull(households.sponsorId) : undefined,
    f.number === undefined ? undefined : eq(households.number, f.number),
    f.ids === undefined ? undefined : inArray(households.id, [...f.ids])
  )
}

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

    findSummary(db: DbOrTx, id: number): HouseholdSummaryRow | null {
      return (
        db
          .select(summaryCols)
          .from(households)
          .innerJoin(sectors, eq(sectors.id, households.sectorId))
          .where(and(eq(households.id, id), active))
          .get() ?? null
      )
    },

    /** Page de la liste, par numéro croissant (index `households_number_unique_idx`). */
    listPage(
      db: DbOrTx,
      f: HouseholdFilters,
      offset: number,
      limit: number
    ): HouseholdSummaryRow[] {
      if (f.ids?.length === 0) return []
      return db
        .select(summaryCols)
        .from(households)
        .innerJoin(sectors, eq(sectors.id, households.sectorId))
        .where(where(f))
        .orderBy(asc(households.number))
        .limit(limit)
        .offset(offset)
        .all()
    },

    count(db: DbOrTx, f: HouseholdFilters): number {
      if (f.ids?.length === 0) return 0
      return db.select({ n: count() }).from(households).where(where(f)).get()?.n ?? 0
    },

    update(
      db: DbOrTx,
      id: number,
      row: { sectorId: number; sponsorId: number | null; at: string }
    ): void {
      db.update(households)
        .set({ sectorId: row.sectorId, sponsorId: row.sponsorId, updatedAt: row.at })
        .where(and(eq(households.id, id), active))
        .run()
    },

    /** `false` si le foyer n'existe pas ou est déjà supprimé. */
    softDelete(db: DbOrTx, id: number, at: string): boolean {
      return (
        db
          .update(households)
          .set({ deletedAt: at, updatedAt: at })
          .where(and(eq(households.id, id), active))
          .run().changes > 0
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
