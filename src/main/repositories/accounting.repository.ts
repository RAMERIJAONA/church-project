import {
  and,
  asc,
  between,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  max,
  sql,
  type SQL
} from 'drizzle-orm'
import type { DbOrTx } from '@main/db/client'
import { accountingEntries, accountingItems } from '@main/db/schema'
import type { EntryRow, ItemRow } from '@shared/domain/accounting/accounting.tree'
import type {
  EntryDTO,
  EntryType,
  Ledger,
  MoveDirection,
  PeriodTotalDTO
} from '@shared/domain/accounting/accounting.types'

const itemCols = {
  id: accountingItems.id,
  parentId: accountingItems.parentId,
  prefix: accountingItems.prefix,
  position: accountingItems.position,
  description: accountingItems.description,
  ledger: accountingItems.ledger
}

/** Élément tel que stocké : la comptabilité en plus (pour les frères du niveau 1). */
export interface ItemRecord extends ItemRow {
  ledger: Ledger
}
const entryCols = {
  id: accountingEntries.id,
  amount: accountingEntries.amount,
  label: accountingEntries.label,
  operatedOn: accountingEntries.operatedOn,
  createdAt: accountingEntries.createdAt,
  updatedAt: accountingEntries.updatedAt
}

export interface EntryRef extends EntryDTO {
  itemId: number
  year: number
  type: EntryType
}

/** Frères d'un élément : même parent ; au niveau 1, même comptabilité et même lettre. */
function siblingsOf(row: Pick<ItemRecord, 'parentId' | 'prefix' | 'ledger'>): SQL {
  const t = accountingItems
  return row.parentId === null
    ? sql`${t.parentId} IS NULL AND ${t.ledger} = ${row.ledger} AND ${t.prefix} = ${row.prefix ?? ''}`
    : eq(t.parentId, row.parentId)
}

/** Accès données de la comptabilité. Les lectures excluent les éléments et saisies supprimés. */
export function createAccountingRepository() {
  const t = accountingItems
  const e = accountingEntries
  return {
    /** Éléments actifs d'une comptabilité (un plan comptable reste sous 200 lignes). */
    listItems(db: DbOrTx, ledger: Ledger): ItemRecord[] {
      return db
        .select(itemCols)
        .from(t)
        .where(and(eq(t.ledger, ledger), isNull(t.deletedAt)))
        .all()
    },

    findItemRow(db: DbOrTx, id: number): ItemRecord | undefined {
      return db
        .select(itemCols)
        .from(t)
        .where(and(eq(t.id, id), isNull(t.deletedAt)))
        .get()
    },

    /** Éléments ayant au moins une saisie active, toutes années et tous types. */
    itemIdsWithEntries(db: DbOrTx): Set<number> {
      const rows = db.selectDistinct({ itemId: e.itemId }).from(e).where(isNull(e.deletedAt)).all()
      return new Set(rows.map((r) => r.itemId))
    },

    listEntriesForYears(db: DbOrTx, years: number[]): EntryRow[] {
      return db
        .select({
          itemId: e.itemId,
          year: e.year,
          type: e.type,
          amount: e.amount,
          label: e.label,
          updatedAt: e.updatedAt
        })
        .from(e)
        .where(and(inArray(e.year, years), isNull(e.deletedAt)))
        .all()
    },

    /** Saisies actives d'une case, par date de création. */
    listCellEntries(db: DbOrTx, itemId: number, year: number, type: EntryType): EntryDTO[] {
      return db
        .select(entryCols)
        .from(e)
        .where(and(eq(e.itemId, itemId), eq(e.year, year), eq(e.type, type), isNull(e.deletedAt)))
        .orderBy(asc(e.createdAt), asc(e.id))
        .all()
    },

    findEntry(db: DbOrTx, id: number): EntryRef | undefined {
      return db
        .select({ ...entryCols, itemId: e.itemId, year: e.year, type: e.type })
        .from(e)
        .where(and(eq(e.id, id), isNull(e.deletedAt)))
        .get()
    },

    countActiveChildren(db: DbOrTx, parentId: number): number {
      const row = db
        .select({ n: sql<number>`count(*)` })
        .from(t)
        .where(and(eq(t.parentId, parentId), isNull(t.deletedAt)))
        .get()
      return row?.n ?? 0
    },

    /** Prochaine position parmi les frères (supprimés compris : jamais réutilisée). */
    nextPosition(db: DbOrTx, parent: Pick<ItemRecord, 'parentId' | 'prefix' | 'ledger'>): number {
      const row = db
        .select({ m: max(t.position) })
        .from(t)
        .where(siblingsOf(parent))
        .get()
      return (row?.m ?? 0) + 1
    },

    insertItem(
      db: DbOrTx,
      values: {
        parentId: number | null
        prefix: string | null
        ledger: Ledger
        position: number
        description: string
        at: string
      }
    ): number {
      const { at, ...rest } = values
      return db
        .insert(t)
        .values({ ...rest, createdAt: at, updatedAt: at })
        .returning({ id: t.id })
        .get().id
    },

    updateItem(
      db: DbOrTx,
      id: number,
      values: { description?: string; position?: number; prefix?: string },
      at: string
    ): void {
      db.update(t)
        .set({ ...values, updatedAt: at })
        .where(eq(t.id, id))
        .run()
    },

    /** Suppression douce de l'élément et de toute sa descendance active. Renvoie le nombre. */
    softDeleteSubtree(db: DbOrTx, id: number, at: string): number {
      const res = db.run(sql`
        WITH RECURSIVE subtree(id) AS (
          SELECT ${id}
          UNION ALL
          SELECT i.id FROM accounting_items i JOIN subtree s ON i.parent_id = s.id
          WHERE i.deleted_at IS NULL
        )
        UPDATE accounting_items SET deleted_at = ${at}, updated_at = ${at}
        WHERE id IN (SELECT id FROM subtree) AND deleted_at IS NULL
      `)
      return res.changes
    },

    /** Frère actif voisin dans la direction donnée. */
    findAdjacentSibling(
      db: DbOrTx,
      row: ItemRecord,
      direction: MoveDirection
    ): ItemRecord | undefined {
      return db
        .select(itemCols)
        .from(t)
        .where(
          and(
            siblingsOf(row),
            isNull(t.deletedAt),
            direction === 'up' ? lt(t.position, row.position) : gt(t.position, row.position)
          )
        )
        .orderBy(direction === 'up' ? desc(t.position) : asc(t.position))
        .limit(1)
        .get()
    },

    insertEntry(
      db: DbOrTx,
      values: {
        itemId: number
        year: number
        type: EntryType
        amount: number
        label: string | null
        operatedOn: string | null
        at: string
      }
    ): number {
      const { at, ...rest } = values
      return db
        .insert(e)
        .values({ ...rest, createdAt: at, updatedAt: at })
        .returning({ id: e.id })
        .get().id
    },

    updateEntry(
      db: DbOrTx,
      id: number,
      values: { amount: number; label: string | null; operatedOn?: string | null },
      at: string
    ): void {
      db.update(e)
        .set({ ...values, updatedAt: at })
        .where(eq(e.id, id))
        .run()
    },

    /** Somme des réalisations actives par élément actif d'une comptabilité, date dans [from, to]. */
    sumActualBetween(db: DbOrTx, ledger: Ledger, from: string, to: string): PeriodTotalDTO[] {
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
            eq(e.type, 'actual'),
            isNull(e.deletedAt),
            isNull(t.deletedAt),
            eq(t.ledger, ledger),
            between(e.operatedOn, from, to)
          )
        )
        .groupBy(e.itemId)
        .all()
    },

    softDeleteEntry(db: DbOrTx, id: number, at: string): void {
      db.update(e).set({ deletedAt: at, updatedAt: at }).where(eq(e.id, id)).run()
    }
  }
}

export type AccountingRepository = ReturnType<typeof createAccountingRepository>
