import { expect, test } from '@playwright/test'
import { launchApp, navLink, removeDir, type LaunchedApp } from './app'

test('@smoke changer le thème : appliqué tout de suite et persisté après redémarrage', async () => {
  let running: LaunchedApp | null = await launchApp()
  const { userData } = running
  try {
    const w = running.window
    await navLink(w, 'Paramètres').click()
    await w.getByRole('radio', { name: 'Sombre' }).click()
    await expect(w.locator('html')).toHaveAttribute('data-theme', 'dark')
    await w.getByRole('radio', { name: 'Vert' }).click()
    await expect(w.locator('html')).toHaveAttribute('data-accent', 'green')
    await running.close()
    running = null

    running = await launchApp({ userData })
    // Appliqué dès le chargement (URL), avant même la réponse IPC
    await expect(running.window.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(running.window.locator('html')).toHaveAttribute('data-accent', 'green')
  } finally {
    await running?.close()
    removeDir(userData)
  }
})
