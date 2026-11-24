import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, navLink, removeDir, type LaunchedApp } from './app'

test('@smoke sauvegarde manuelle → restauration → données identiques', async () => {
  let running: LaunchedApp | null = await launchApp()
  const { userData } = running
  const backupsDir = join(userData, 'Sauvegardes')
  try {
    const w = running.window
    await navLink(w, 'Paramètres').click()

    // État A (thème sombre), sauvegardé
    await w.getByRole('radio', { name: 'Sombre' }).click()
    await w.getByRole('button', { name: 'Sauvegarder maintenant' }).click()
    await expect(w.getByText('Sauvegarde effectuée')).toBeVisible()
    const manual = readdirSync(backupsDir).find((f) => f.endsWith('_manuel.db'))
    expect(manual).toBeDefined()

    // État B (thème clair), puis restauration de A
    await w.getByRole('radio', { name: 'Clair' }).click()
    await expect(w.locator('html')).toHaveAttribute('data-theme', 'light')

    const source = join(backupsDir, manual ?? '')
    await running.app.evaluate(({ app, dialog }, file) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as never
      dialog.showMessageBox = (async () => ({ response: 0, checkboxChecked: false })) as never
      app.relaunch = () => undefined // le test relance lui-même
    }, source)
    const exited = running.app.waitForEvent('close')
    await w.getByRole('button', { name: 'Restaurer…' }).click()
    await exited
    running = null

    // Relance : l'état A est revenu, l'état B a été mis de côté avant restauration
    running = await launchApp({ userData })
    await expect(running.window.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(readdirSync(backupsDir).some((f) => f.endsWith('_avant-restauration.db'))).toBe(true)
  } finally {
    await running?.close()
    removeDir(userData)
  }
})
