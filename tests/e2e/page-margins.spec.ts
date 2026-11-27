import { expect, test, type Page } from '@playwright/test'
import { launchApp, navLink, removeDir } from './app'

/**
 * Régression (2026-11-27) : en Paramètres, la section Aide collait au bas de la fenêtre. Le
 * conteneur des pages avait reçu la hauteur de la zone visible (pour que seul le tableau des
 * fidèles défile) : une page plus haute débordait de ce conteneur et perdait sa marge du bas.
 * Contrôle par mesure : fenêtre à sa taille minimale, défilement jusqu'en bas, la marge sous
 * la dernière section doit égaler la marge au-dessus de la première.
 */
async function margins(w: Page): Promise<{ top: number; bottom: number; scrolls: boolean }> {
  return w.locator('main').evaluate((main) => {
    // main > conteneur avec marges > page
    const page = main.firstElementChild?.firstElementChild
    if (!page) throw new Error('page introuvable')
    main.scrollTop = 0
    const top = page.getBoundingClientRect().top - main.getBoundingClientRect().top
    main.scrollTop = main.scrollHeight
    const bottom = main.getBoundingClientRect().bottom - page.getBoundingClientRect().bottom
    return { top, bottom, scrolls: main.scrollHeight > main.clientHeight }
  })
}

test('les pages longues gardent leur marge du bas', async () => {
  const running = await launchApp()
  try {
    const w = running.window
    await running.app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win) throw new Error('aucune fenêtre')
      const [width = 0, height = 0] = win.getMinimumSize()
      win.setSize(width, height)
    })
    await navLink(w, 'Paramètres').click()
    await expect(w.getByRole('heading', { name: 'Aide' })).toBeVisible()

    const m = await margins(w)
    expect(m.scrolls).toBe(true) // la page dépasse bien de la fenêtre
    expect(m.top).toBeGreaterThan(0)
    expect(Math.abs(m.bottom - m.top)).toBeLessThanOrEqual(1)
  } finally {
    await running.close()
    removeDir(running.userData)
  }
})
