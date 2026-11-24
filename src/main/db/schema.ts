/**
 * Schéma Drizzle : source de vérité des tables.
 * Toute modification → `npm run db:generate` → nouvelle migration dans drizzle/ (jamais éditer
 * une migration publiée).
 *
 * Conventions (CLAUDE.md par. 7) :
 * - dates : TEXT ISO 8601 en UTC (`2026-11-24T10:00:00.000Z`), produites par l'horloge injectée
 * - montants : INTEGER dans la plus petite unité
 */
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  type AnySQLiteColumn
} from 'drizzle-orm/sqlite-core'

/** Préférences de l'application (thème, accent, densité…). Une ligne par clé, valeur JSON. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull()
})

/*
 * Comptabilité : arborescence sur 4 niveaux (F1 > F1-I > F1-I-1 > F1-I-1 A)).
 * Les numéros ne sont PAS stockés : ils se déduisent de `prefix` (niveau 1) et de l'ordre
 * `position` des éléments non supprimés (shared/domain/accounting).
 * Suppression douce (`deleted_at`) : rien n'est effacé physiquement.
 * Migration 0002 : reprise des anciennes tables accounting_sections / lines / amounts.
 */

/** Élément de l'arbre. `parent_id` NULL = niveau 1 (avec une lettre), sinon pas de lettre. */
export const accountingItems = sqliteTable(
  'accounting_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    parentId: integer('parent_id').references((): AnySQLiteColumn => accountingItems.id),
    /** Niveau 1 : lettre(s) de l'alphabet malgache (« A », « B », « D »…) ; NULL ailleurs */
    prefix: text('prefix'),
    /** Ordre parmi les frères (croissant, avec des trous possibles) */
    position: integer('position').notNull(),
    description: text('description').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at')
  },
  (t) => [
    index('accounting_items_parent_position_idx').on(t.parentId, t.position),
    check(
      'accounting_items_prefix_check',
      sql`(${t.parentId} IS NULL AND ${t.prefix} IS NOT NULL AND ${t.prefix} NOT GLOB '*[^ABD-PR-TVYZ]*' AND length(${t.prefix}) BETWEEN 1 AND 3) OR (${t.parentId} IS NOT NULL AND ${t.prefix} IS NULL)`
    )
  ]
)

/**
 * Saisie d'un montant (Ariary, entier ≥ 0) pour un élément, une année et un type
 * (estimation / réalisation). Le montant d'une case est la somme de ses saisies actives.
 * `label` NULL = total direct. `operated_on` : date d'opération (« AAAA-MM-JJ ») d'une
 * réalisation, dans l'année de la case ; NULL pour une estimation (annuelle).
 */
export const accountingEntries = sqliteTable(
  'accounting_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    itemId: integer('item_id')
      .notNull()
      .references(() => accountingItems.id),
    year: integer('year').notNull(),
    type: text('type', { enum: ['estimate', 'actual'] }).notNull(),
    amount: integer('amount').notNull(),
    label: text('label'),
    operatedOn: text('operated_on'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at')
  },
  (t) => [
    index('accounting_entries_year_item_idx').on(t.year, t.itemId),
    index('accounting_entries_operated_on_idx').on(t.operatedOn),
    check('accounting_entries_type_check', sql`${t.type} IN ('estimate', 'actual')`),
    check('accounting_entries_amount_check', sql`${t.amount} >= 0`),
    check(
      'accounting_entries_operated_on_check',
      sql`(${t.type} = 'estimate' AND ${t.operatedOn} IS NULL) OR (${t.type} = 'actual' AND ${t.operatedOn} IS NOT NULL AND CAST(substr(${t.operatedOn}, 1, 4) AS INTEGER) = ${t.year})`
    )
  ]
)
