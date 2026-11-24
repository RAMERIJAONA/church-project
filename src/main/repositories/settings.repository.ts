import { sql } from 'drizzle-orm'
import type { DbOrTx } from '@main/db/client'
import { settings } from '@main/db/schema'
import type { StoredSetting } from '@shared/domain/settings/settings.rules'

export function createSettingsRepository() {
  return {
    getAll(db: DbOrTx): StoredSetting[] {
      return db.select({ key: settings.key, value: settings.value }).from(settings).all()
    },

    upsertMany(db: DbOrTx, rows: readonly StoredSetting[], updatedAt: string): void {
      if (rows.length === 0) return
      db.insert(settings)
        .values(rows.map((r) => ({ ...r, updatedAt })))
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: sql`excluded.value`, updatedAt: sql`excluded.updated_at` }
        })
        .run()
    }
  }
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>
