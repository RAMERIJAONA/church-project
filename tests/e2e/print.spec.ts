import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, navLink, removeDir } from './app'

/** Marge du PDF demandée par le porteur (haut, bas, gauche, droite). */
const PAGE_MARGIN = '32px'
/** Largeur utile d'une page A4 (210 mm) moins deux marges de 32 px, en px CSS. */
const A4_CONTENT_WIDTH = Math.floor((210 / 25.4) * 96) - 2 * 32

const pdfOf = (running: Awaited<ReturnType<typeof launchApp>>) =>
  running.app.evaluate(async ({ BrowserWindow }) => {
    const contents = BrowserWindow.getAllWindows()[0]?.webContents
    if (!contents) throw new Error('aucune fenêtre')
    const printers = await contents.getPrintersAsync()
    const pdf = await contents.printToPDF({ printBackground: true, preferCSSPageSize: true })
    const text = Buffer.from(pdf).toString('latin1')
    return {
      printers: Array.isArray(printers),
      head: text.slice(0, 4),
      pages: (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length
    }
  })

/**
 * Les deux appels Electron de `adapters/print.adapter.ts`, sur l'app réelle : liste des
 * imprimantes (vide sur un poste sans imprimante) et génération du PDF avec la mise en page
 * d'impression. La boîte de dialogue système, elle, ne s'automatise pas.
 */
test('impression : liste des imprimantes et PDF de la page de comptabilité', async () => {
  const running = await launchApp()
  try {
    await navLink(running.window, 'Comptabilité').click()
    await expect(running.window.getByRole('button', { name: 'Imprimer' })).toBeVisible()
    const pdf = await pdfOf(running)
    expect(pdf.printers).toBe(true)
    expect(pdf.head).toBe('%PDF')
  } finally {
    await running.close()
    removeDir(running.userData)
  }
})

/**
 * Régression (2026-11-24) : le PDF du plan 2025 (107 rubriques) n'avait qu'une page (la coque
 * de l'app fixe la hauteur à l'écran et fait défiler <main>) et la colonne de droite était
 * coupée (descriptions sur une seule ligne : tableau plus large que la page A4).
 * Demande du porteur : marges de 32 px et total une seule fois, à la fin du tableau.
 */
test('impression : tout le plan comptable, sur plusieurs pages et dans la largeur A4', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'church-print-'))
  execFileSync('npm', ['run', 'seed:accounting'], {
    env: { ...process.env, SEED_DIR: userData },
    stdio: 'ignore'
  })
  const running = await launchApp({ userData })
  try {
    const w = running.window
    await navLink(w, 'Comptabilité').click()
    await w.getByRole('button', { name: 'Année précédente' }).click()
    await expect(w.getByRole('columnheader', { name: 'Réalisation 2025' })).toBeVisible()
    await expect(w.getByRole('rowheader', { name: 'G1', exact: true })).toBeAttached()

    expect((await pdfOf(running)).pages).toBeGreaterThanOrEqual(2)

    await w.emulateMedia({ media: 'print' })
    await w.setViewportSize({ width: A4_CONTENT_WIDTH, height: 1000 })
    const layout = await w.evaluate(() => {
      const table = document.querySelector('table')
      const main = document.querySelector('main')
      const clipped = [...document.querySelectorAll<HTMLElement>('th, td, td *')].filter(
        (el) => el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1
      )
      const pageRule = [...document.styleSheets]
        .flatMap((sheet) => [...sheet.cssRules])
        .find((rule): rule is CSSPageRule => rule instanceof CSSPageRule)
      const tfoot = document.querySelector('tfoot')
      return {
        pageMargin: pageRule?.style.getPropertyValue('margin'),
        // table-footer-group = répété en bas de chaque page ; table-row-group = une seule fois
        totalDisplay: tfoot ? getComputedStyle(tfoot).display : null,
        tableRight: Math.round(table?.getBoundingClientRect().right ?? 0),
        width: document.documentElement.clientWidth,
        mainClips: main !== null && main.scrollHeight > main.clientHeight + 1,
        clipped: clipped.slice(0, 3).map((el) => el.textContent?.slice(0, 40))
      }
    })
    expect(layout.pageMargin).toBe(PAGE_MARGIN)
    expect(layout.totalDisplay).toBe('table-row-group')
    expect(layout.mainClips).toBe(false)
    expect(layout.tableRight).toBeLessThanOrEqual(layout.width)
    expect(layout.clipped).toEqual([])
  } finally {
    await running.close()
    removeDir(userData)
  }
})
