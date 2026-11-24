/**
 * Schéma Drizzle : source de vérité des tables.
 * Toute modification → `npm run db:generate` → nouvelle migration dans drizzle/ (jamais éditer
 * une migration publiée).
 *
 * Conventions (CLAUDE.md par. 7) :
 * - dates : TEXT ISO 8601 en UTC (`2026-11-24T10:00:00.000Z`), produites par l'horloge injectée
 * - montants : INTEGER dans la plus petite unité
 */
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** Préférences de l'application (thème, accent, densité…). Une ligne par clé, valeur JSON. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull()
})
