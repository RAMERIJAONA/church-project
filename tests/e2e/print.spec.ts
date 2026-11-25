import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'
import { expect, test } from '@playwright/test'
import { launchApp, navLink, removeDir } from './app'

/** Marge du PDF demandée par le porteur (haut, bas, gauche, droite), 2026-11-25. */
const MARGIN_PX = 64
const PAGE_MARGIN = `${MARGIN_PX}px`
/** Largeur utile d'une page A4 (210 mm) moins deux marges, en px CSS. */
const A4_CONTENT_WIDTH = Math.floor((210 / 25.4) * 96) - 2 * MARGIN_PX

/**
 * Marges réelles de la 1re page du PDF, en points (1 px CSS = 0,75 pt). Chromium (Skia) ouvre
 * le contenu de page par une mise à l'échelle (`s 0 0 -s 0 h cm`) puis un rectangle de
 * découpe (`q x y l h re W* n`) placé à la marge gauche / haute.
 */
function pdfMargins(pdf: Buffer): { left: number; top: number } | null {
  for (const m of pdf.toString('latin1').matchAll(/stream\r?\n/g)) {
    const start = (m.index ?? 0) + m[0].length
    const end = pdf.indexOf('endstream', start, 'latin1')
    let text: string
    try {
      text = inflateSync(pdf.subarray(start, end)).toString('latin1')
    } catch {
      continue // flux non compressé (police, image) : ignoré
    }
    const scale = /^([\d.]+) 0 0 -[\d.]+ 0 [\d.]+ cm/.exec(text)
    const clip = /q\n([\d.]+) ([\d.]+) [\d.]+ [\d.]+ re\nW\* n/.exec(text)
    if (scale && clip) {
      const s = Number(scale[1])
      return { left: Number(clip[1]) * s, top: Number(clip[2]) * s }
    }
  }
  return null
}

const pdfOf = (running: Awaited<ReturnType<typeof launchApp>>) =>
  running.app
    .evaluate(async ({ BrowserWindow }) => {
      const contents = BrowserWindow.getAllWindows()[0]?.webContents
      if (!contents) throw new Error('aucune fenêtre')
      const printers = await contents.getPrintersAsync()
      const pdf = await contents.printToPDF({ printBackground: true, preferCSSPageSize: true })
      return { printers: Array.isArray(printers), base64: Buffer.from(pdf).toString('base64') }
    })
    .then(({ printers, base64 }) => {
      const pdf = Buffer.from(base64, 'base64')
      const text = pdf.toString('latin1')
      return {
        printers,
        head: text.slice(0, 4),
        pages: (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length,
        margins: pdfMargins(pdf)
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
    // Régression (2026-11-25) : marges de 64 px non visibles dans le PDF. Mesurées dans le PDF
    // produit (@page de print.css seul, sans option de marge), pas seulement dans le CSS.
    expect(pdf.margins?.left).toBeCloseTo(MARGIN_PX * 0.75, 0)
    expect(pdf.margins?.top).toBeCloseTo(MARGIN_PX * 0.75, 0)
  } finally {
    await running.close()
    removeDir(running.userData)
  }
})

/**
 * Régression (2026-11-24) : le PDF du plan 2025 (107 rubriques) n'avait qu'une page (la coque
 * de l'app fixe la hauteur à l'écran et fait défiler <main>) et la colonne de droite était
 * coupée (descriptions sur une seule ligne : tableau plus large que la page A4).
 * Demande du porteur : marges de 64 px et total une seule fois, à la fin du tableau.
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

    // Régression (2026-11-25) : « 999 999… » au lieu de « 999 999 999 999 Ar ». Le plus grand
    // montant possible doit tenir dans chaque case et chaque total, en densité normale et compacte.
    for (const density of ['comfortable', 'compact']) {
      const overflow = await w.evaluate((d) => {
        document.documentElement.dataset['density'] = d
        const max = '999\u00a0999\u00a0999\u00a0999'
        const ctx = document.createElement('canvas').getContext('2d')
        const width = (text: string, el: Element): number => {
          if (!ctx) return Infinity
          ctx.font = getComputedStyle(el).font
          return ctx.measureText(text).width
        }
        const inner = (el: HTMLElement): number => {
          const cs = getComputedStyle(el)
          return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
        }
        const bad: string[] = []
        for (const input of document.querySelectorAll<HTMLInputElement>('input[data-amount]')) {
          if (width(max, input) > inner(input)) bad.push(input.getAttribute('aria-label') ?? '')
        }
        // Sous-totaux et total général : chiffres en gras + « Ar » en petit
        for (const span of document.querySelectorAll<HTMLElement>(
          'td > div > span.font-semibold'
        )) {
          const mark = span.querySelector('span')
          const text = width(max, span) + (mark ? width('\u00a0Ar', mark) : 0)
          if (text > inner(span) || span.scrollWidth > span.clientWidth)
            bad.push(span.textContent ?? '')
        }
        return bad.slice(0, 3)
      }, density)
      expect(overflow, density).toEqual([])
    }
    await w.evaluate(() => delete document.documentElement.dataset['density'])

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
