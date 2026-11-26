import { expect, test } from '@playwright/test'
import { launchApp, navLink, newChild, removeDir } from './app'

/**
 * Régression (2026-11-26) : à l'ajout d'une sous-rubrique, le bouton « Ajouter » recouvrait le
 * champ Description. Les boutons « Ajouter » et « Fermer » étaient dans la colonne d'actions
 * (w-20, plus étroite qu'eux) et débordaient vers la gauche, par-dessus le champ.
 * Contrôle par mesure (pas de capture) : fenêtre à sa taille minimale, deux densités, deux
 * tailles de texte.
 */
test('ajout de sous-rubrique : le champ et les boutons ne se chevauchent pas', async () => {
  const running = await launchApp()
  try {
    const w = running.window
    await running.app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win) throw new Error('aucune fenêtre')
      const [width = 0, height = 0] = win.getMinimumSize()
      win.setSize(width, height)
    })
    await navLink(w, 'Comptabilité des sorties').click()
    await w.getByRole('button', { name: 'Créer la première rubrique' }).click()
    await w.getByLabel('Description', { exact: true }).fill('asa iombonana')
    await w.getByRole('button', { name: 'Créer la rubrique' }).click()

    const input = newChild(w, 'A1-1')
    const add = w.getByRole('button', { name: 'Ajouter', exact: true })
    const close = w.getByRole('button', { name: 'Fermer l’ajout de sous-rubrique' })
    await expect(input).toBeVisible()

    for (const density of ['comfortable', 'compact']) {
      for (const fontSize of [14, 16]) {
        await w.evaluate(
          ([d, px]) => {
            document.documentElement.dataset['density'] = String(d)
            document.documentElement.style.setProperty('--font-size-base', `${px}px`)
          },
          [density, fontSize] as const
        )
        const [i, a, c] = await Promise.all([input, add, close].map((l) => l.boundingBox()))
        if (!i || !a || !c) throw new Error('élément non affiché')
        const context = `${density}, ${fontSize}px`
        expect(i.x + i.width, `champ avant « Ajouter » (${context})`).toBeLessThanOrEqual(a.x)
        expect(a.x + a.width, `« Ajouter » avant « Fermer » (${context})`).toBeLessThanOrEqual(c.x)
        expect(i.width, `champ assez large pour écrire (${context})`).toBeGreaterThan(200)
      }
    }
  } finally {
    await running.close()
    removeDir(running.userData)
  }
})
