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
import { check, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** Préférences de l'application (thème, accent, densité…). Une ligne par clé, valeur JSON. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull()
})

/*
 * Comptabilité. Les numéros (A1, A1-1…) ne sont PAS stockés : ils se déduisent de `prefix`
 * et de l'ordre `position` des éléments non supprimés (shared/domain/accounting).
 * Suppression douce (`deleted_at`) : rien n'est effacé physiquement.
 */

/** Rubrique (parent) : « A1 - ASA IOMBONANA ». Pas de montant. */
export const accountingSections = sqliteTable(
  'accounting_sections',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Lettre(s) de l'alphabet malgache, attribuée(s) automatiquement : « A », « B », « D »… */
    prefix: text('prefix').notNull(),
    /** Ordre dans la lettre (croissant, avec des trous possibles) */
    position: integer('position').notNull(),
    description: text('description').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at')
  },
  (t) => [
    index('accounting_sections_prefix_position_idx').on(t.prefix, t.position),
    check(
      'accounting_sections_prefix_check',
      sql`${t.prefix} NOT GLOB '*[^ABD-PR-TVYZ]*' AND length(${t.prefix}) BETWEEN 1 AND 3`
    )
  ]
)

/** Ligne (enfant) : « A1-1 Kitapo iombonana ». Porte un montant par année. */
export const accountingLines = sqliteTable(
  'accounting_lines',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sectionId: integer('section_id')
      .notNull()
      .references(() => accountingSections.id),
    /** Ordre dans la rubrique (croissant, avec des trous possibles) */
    position: integer('position').notNull(),
    description: text('description').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at')
  },
  (t) => [index('accounting_lines_section_position_idx').on(t.sectionId, t.position)]
)

/** Montant d'une ligne pour une année (Ariary, entier ≥ 0). Absence de ligne = pas de montant. */
export const accountingAmounts = sqliteTable(
  'accounting_amounts',
  {
    lineId: integer('line_id')
      .notNull()
      .references(() => accountingLines.id),
    year: integer('year').notNull(),
    amount: integer('amount').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (t) => [
    primaryKey({ columns: [t.lineId, t.year] }),
    index('accounting_amounts_year_idx').on(t.year),
    check('accounting_amounts_amount_check', sql`${t.amount} >= 0`)
  ]
)
