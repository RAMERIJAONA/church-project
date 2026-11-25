import { expect, test, type Page } from '@playwright/test'
import { launchApp, navLink, removeDir } from './app'

const rowheader = (w: Page, code: string) => w.getByRole('rowheader', { name: code, exact: true })

/**
 * Comptabilité des entrées (2026-11-25) : mêmes écrans que les sorties, numéros du niveau 1 à
 * partir de 2 (A2, A3, B2…) et données séparées des sorties.
 */
test('@smoke comptabilité des entrées : numéros A2…, séparée des sorties', async () => {
  const running = await launchApp()
  try {
    const w = running.window
    await navLink(w, 'Comptabilité des entrées').click()
    // Régression (2026-11-25) : libellé du menu sur 2 lignes, sans marge en haut ni en bas.
    // Chaque libellé tient sur une ligne et chaque lien garde sa marge interne.
    const menu = await w
      .getByRole('navigation', { name: 'Navigation principale' })
      .evaluate((nav) =>
        [...nav.querySelectorAll('a')].map((a) => {
          const range = document.createRange()
          range.selectNodeContents(a.lastChild ?? a) // le texte, sans l'icône
          const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size
          return { text: a.textContent, lines, padding: parseFloat(getComputedStyle(a).paddingTop) }
        })
      )
    for (const link of menu) {
      expect(link.lines, link.text ?? '').toBe(1)
      expect(link.padding, link.text ?? '').toBeGreaterThan(0)
    }
    await expect(
      w.getByRole('heading', { level: 1, name: 'Comptabilité des entrées' })
    ).toBeVisible()

    // Première rubrique : A2 ; sous-rubriques A2-1 puis A2-2
    await w.getByRole('button', { name: 'Créer la première rubrique' }).click()
    await expect(w.getByRole('status', { name: 'Numéro attribué' })).toHaveText('A2')
    await w.getByLabel('Description', { exact: true }).fill('rakitra')
    await w.getByRole('button', { name: 'Créer la rubrique' }).click()
    for (const [code, description] of [
      ['A2-1', 'Rakitra alahady'],
      ['A2-2', 'Fanatitra']
    ] as const) {
      const input = w.getByLabel(`Description de la nouvelle sous-rubrique ${code}`)
      await input.fill(description)
      await input.press('Enter')
    }
    await w.keyboard.press('Escape')
    await expect(rowheader(w, 'A2')).toBeVisible()
    await expect(rowheader(w, 'A2-2')).toBeVisible()

    // Montant saisi dans les entrées : compté dans leur synthèse, pas dans les sorties
    const amount = w.getByRole('textbox', {
      name: `Réalisation ${new Date().getFullYear()} de A2-1`
    })
    await amount.click()
    await w.keyboard.type('250000')
    await w.keyboard.press('Enter')
    const summary = w.getByRole('region', { name: 'Synthèse : prévu et réalisé' })
    await expect(summary).toContainText(/250\s000\sAr/)
    // En-tête imprimé (masqué à l'écran) : nomme la comptabilité des entrées
    const printed = w.getByRole('heading', {
      name: /: comptabilité des entrées$/,
      includeHidden: true
    })
    await expect(printed).toBeAttached()

    await navLink(w, 'Comptabilité des sorties').click()
    await expect(
      w.getByRole('heading', { level: 1, name: 'Comptabilité des sorties' })
    ).toBeVisible()
    await expect(w.getByRole('button', { name: 'Créer la première rubrique' })).toBeVisible()
    await expect(rowheader(w, 'A2')).toHaveCount(0)
    await expect(summary).not.toContainText(/250\s000/)
    // Dans les sorties, la première rubrique reste A1
    await w.getByRole('button', { name: 'Créer la première rubrique' }).click()
    await expect(w.getByRole('status', { name: 'Numéro attribué' })).toHaveText('A1')
  } finally {
    await running.close()
    removeDir(running.userData)
  }
})
