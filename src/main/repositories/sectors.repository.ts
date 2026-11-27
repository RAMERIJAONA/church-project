import { asc, eq, max, ne, sql } from 'drizzle-orm'
import type { DbOrTx } from '@main/db/client'
import { households, members, sectors } from '@main/db/schema'

export interface SectorRow {
  id: number
  number: number
  name: string
  householdCount: number
  memberCount: number
}

/** Foyers et fidèles actifs du secteur (index `households_sector_idx`, `members_rank_unique_idx`). */
const householdCount = sql<number>`(SELECT count(*) FROM ${households} h
  WHERE h.sector_id = "sectors"."id" AND h.deleted_at IS NULL)`
const memberCount = sql<number>`(SELECT count(*) FROM ${households} h
  JOIN ${members} m ON m.household_id = h.id AND m.deleted_at IS NULL
  WHERE h.sector_id = "sectors"."id" AND h.deleted_at IS NULL)`

const cols = {
  id: sectors.id,
  number: sectors.number,
  name: sectors.name,
  householdCount,
  memberCount
}

/** Accès données des secteurs (pas de suppression : non demandée). */
export function createSectorsRepository() {
  return {
    list(db: DbOrTx): SectorRow[] {
      return db.select(cols).from(sectors).orderBy(asc(sectors.number)).all()
    },

    findById(db: DbOrTx, id: number): SectorRow | null {
      return db.select(cols).from(sectors).where(eq(sectors.id, id)).get() ?? null
    },

    /** Insensible à la casse, comme l'index unique `sectors_name_unique_idx`. */
    findByName(db: DbOrTx, name: string, exceptId?: number): SectorRow | null {
      return (
        db
          .select(cols)
          .from(sectors)
          .where(
            sql`${sectors.name} = ${name} COLLATE NOCASE${
              exceptId === undefined ? sql`` : sql` AND ${ne(sectors.id, exceptId)}`
            }`
          )
          .get() ?? null
      )
    },

    maxNumber(db: DbOrTx): number | null {
      return (
        db
          .select({ n: max(sectors.number) })
          .from(sectors)
          .get()?.n ?? null
      )
    },

    insert(db: DbOrTx, row: { number: number; name: string; createdAt: string }): number {
      return db
        .insert(sectors)
        .values({ ...row, updatedAt: row.createdAt })
        .returning({ id: sectors.id })
        .get().id
    },

    rename(db: DbOrTx, id: number, name: string, at: string): void {
      db.update(sectors).set({ name, updatedAt: at }).where(eq(sectors.id, id)).run()
    }
  }
}

export type SectorsRepository = ReturnType<typeof createSectorsRepository>
