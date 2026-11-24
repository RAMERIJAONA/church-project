import { existsSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { expect, test } from '@playwright/test'
import { launchApp, removeDir } from './app'

test('@smoke démarrage à vide : migrations OK puis écran affiché', async () => {
  const { window, userData, close } = await launchApp()
  try {
    await expect(window).toHaveTitle('Church Manager')
    await expect(window.getByRole('heading', { level: 1, name: 'Accueil' })).toBeVisible()
    await expect(window.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()

    const dbPath = join(userData, 'data.db')
    expect(existsSync(dbPath)).toBe(true)
    const db = new Database(dbPath, { readonly: true, fileMustExist: true })
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").pluck().all()
      expect(tables).toContain('settings')
      expect(tables).toContain('__drizzle_migrations')
    } finally {
      db.close()
    }
  } finally {
    await close()
    removeDir(userData)
  }
})
