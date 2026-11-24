import type { Sqlite } from '@main/db/client'
import { MIGRATIONS_TABLE } from '@main/db/migrate'

/** Tables applicatives (hors tables internes SQLite et suivi des migrations). */
export function listTables(sqlite: Sqlite): string[] {
  return sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> ? ORDER BY name"
    )
    .pluck()
    .all(MIGRATIONS_TABLE) as string[]
}

export function countRowsPerTable(sqlite: Sqlite): Record<string, number> {
  return Object.fromEntries(
    listTables(sqlite).map((t) => [
      t,
      sqlite.prepare(`SELECT COUNT(*) FROM "${t}"`).pluck().get() as number
    ])
  )
}
