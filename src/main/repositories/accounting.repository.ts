import { and, asc, desc, eq, gt, isNull, lt, max, sql } from 'drizzle-orm'
import type { DbOrTx } from '@main/db/client'
import { accountingAmounts, accountingLines, accountingSections } from '@main/db/schema'
import type { AmountRow, LineRow, SectionRow } from '@shared/domain/accounting/accounting.rules'
import type { MoveDirection } from '@shared/domain/accounting/accounting.types'

const sectionCols = {
  id: accountingSections.id,
  prefix: accountingSections.prefix,
  position: accountingSections.position,
  description: accountingSections.description
}
const lineCols = {
  id: accountingLines.id,
  sectionId: accountingLines.sectionId,
  position: accountingLines.position,
  description: accountingLines.description
}

/** Accès données de la comptabilité. Toutes les lectures excluent les éléments supprimés. */
export function createAccountingRepository() {
  return {
    listSections(db: DbOrTx): SectionRow[] {
      return db
        .select(sectionCols)
        .from(accountingSections)
        .where(isNull(accountingSections.deletedAt))
        .all()
    },

    /** Lignes actives dont la rubrique est active. */
    listLines(db: DbOrTx): LineRow[] {
      return db
        .select(lineCols)
        .from(accountingLines)
        .innerJoin(accountingSections, eq(accountingSections.id, accountingLines.sectionId))
        .where(and(isNull(accountingLines.deletedAt), isNull(accountingSections.deletedAt)))
        .all()
    },

    listAmounts(db: DbOrTx, year: number): AmountRow[] {
      return db
        .select({ lineId: accountingAmounts.lineId, amount: accountingAmounts.amount })
        .from(accountingAmounts)
        .where(eq(accountingAmounts.year, year))
        .all()
    },

    findSection(db: DbOrTx, id: number): SectionRow | undefined {
      return db
        .select(sectionCols)
        .from(accountingSections)
        .where(and(eq(accountingSections.id, id), isNull(accountingSections.deletedAt)))
        .get()
    },

    /** Ligne active dans une rubrique active. */
    findLine(db: DbOrTx, id: number): LineRow | undefined {
      return db
        .select(lineCols)
        .from(accountingLines)
        .innerJoin(accountingSections, eq(accountingSections.id, accountingLines.sectionId))
        .where(
          and(
            eq(accountingLines.id, id),
            isNull(accountingLines.deletedAt),
            isNull(accountingSections.deletedAt)
          )
        )
        .get()
    },

    countActiveSections(db: DbOrTx, prefix: string): number {
      const row = db
        .select({ n: sql<number>`count(*)` })
        .from(accountingSections)
        .where(and(eq(accountingSections.prefix, prefix), isNull(accountingSections.deletedAt)))
        .get()
      return row?.n ?? 0
    },

    countActiveLines(db: DbOrTx, sectionId: number): number {
      const row = db
        .select({ n: sql<number>`count(*)` })
        .from(accountingLines)
        .where(and(eq(accountingLines.sectionId, sectionId), isNull(accountingLines.deletedAt)))
        .get()
      return row?.n ?? 0
    },

    /** Prochaine position (supprimés compris : une position n'est jamais réutilisée). */
    nextSectionPosition(db: DbOrTx, prefix: string): number {
      const row = db
        .select({ m: max(accountingSections.position) })
        .from(accountingSections)
        .where(eq(accountingSections.prefix, prefix))
        .get()
      return (row?.m ?? 0) + 1
    },

    nextLinePosition(db: DbOrTx, sectionId: number): number {
      const row = db
        .select({ m: max(accountingLines.position) })
        .from(accountingLines)
        .where(eq(accountingLines.sectionId, sectionId))
        .get()
      return (row?.m ?? 0) + 1
    },

    insertSection(
      db: DbOrTx,
      values: { prefix: string; position: number; description: string; at: string }
    ): number {
      const { at, ...rest } = values
      const row = db
        .insert(accountingSections)
        .values({ ...rest, createdAt: at, updatedAt: at })
        .returning({ id: accountingSections.id })
        .get()
      return row.id
    },

    insertLine(
      db: DbOrTx,
      values: { sectionId: number; position: number; description: string; at: string }
    ): number {
      const { at, ...rest } = values
      const row = db
        .insert(accountingLines)
        .values({ ...rest, createdAt: at, updatedAt: at })
        .returning({ id: accountingLines.id })
        .get()
      return row.id
    },

    updateSection(
      db: DbOrTx,
      id: number,
      values: { description?: string; position?: number },
      at: string
    ): void {
      db.update(accountingSections)
        .set({ ...values, updatedAt: at })
        .where(eq(accountingSections.id, id))
        .run()
    },

    updateLine(
      db: DbOrTx,
      id: number,
      values: { description?: string; position?: number },
      at: string
    ): void {
      db.update(accountingLines)
        .set({ ...values, updatedAt: at })
        .where(eq(accountingLines.id, id))
        .run()
    },

    /** Suppression douce de la rubrique ET de ses lignes actives. Renvoie le nombre de lignes. */
    softDeleteSection(db: DbOrTx, id: number, at: string): number {
      const lines = db
        .update(accountingLines)
        .set({ deletedAt: at, updatedAt: at })
        .where(and(eq(accountingLines.sectionId, id), isNull(accountingLines.deletedAt)))
        .run()
      db.update(accountingSections)
        .set({ deletedAt: at, updatedAt: at })
        .where(eq(accountingSections.id, id))
        .run()
      return lines.changes
    },

    softDeleteLine(db: DbOrTx, id: number, at: string): void {
      db.update(accountingLines)
        .set({ deletedAt: at, updatedAt: at })
        .where(eq(accountingLines.id, id))
        .run()
    },

    /** Rubrique active voisine (même lettre) dans la direction donnée. */
    findAdjacentSection(
      db: DbOrTx,
      section: SectionRow,
      direction: MoveDirection
    ): SectionRow | undefined {
      const t = accountingSections
      return db
        .select(sectionCols)
        .from(t)
        .where(
          and(
            eq(t.prefix, section.prefix),
            isNull(t.deletedAt),
            direction === 'up' ? lt(t.position, section.position) : gt(t.position, section.position)
          )
        )
        .orderBy(direction === 'up' ? desc(t.position) : asc(t.position))
        .limit(1)
        .get()
    },

    /** Ligne active voisine (même rubrique) dans la direction donnée. */
    findAdjacentLine(db: DbOrTx, line: LineRow, direction: MoveDirection): LineRow | undefined {
      const t = accountingLines
      return db
        .select(lineCols)
        .from(t)
        .where(
          and(
            eq(t.sectionId, line.sectionId),
            isNull(t.deletedAt),
            direction === 'up' ? lt(t.position, line.position) : gt(t.position, line.position)
          )
        )
        .orderBy(direction === 'up' ? desc(t.position) : asc(t.position))
        .limit(1)
        .get()
    },

    upsertAmount(db: DbOrTx, lineId: number, year: number, amount: number, at: string): void {
      db.insert(accountingAmounts)
        .values({ lineId, year, amount, updatedAt: at })
        .onConflictDoUpdate({
          target: [accountingAmounts.lineId, accountingAmounts.year],
          set: { amount: sql`excluded.amount`, updatedAt: sql`excluded.updated_at` }
        })
        .run()
    },

    deleteAmount(db: DbOrTx, lineId: number, year: number): void {
      db.delete(accountingAmounts)
        .where(and(eq(accountingAmounts.lineId, lineId), eq(accountingAmounts.year, year)))
        .run()
    }
  }
}

export type AccountingRepository = ReturnType<typeof createAccountingRepository>
