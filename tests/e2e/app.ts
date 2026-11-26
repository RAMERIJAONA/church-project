import {
  _electron as electron,
  expect,
  type ElectronApplication,
  type Locator,
  type Page
} from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

export interface LaunchedApp {
  app: ElectronApplication
  window: Page
  userData: string
  close: () => Promise<void>
}

const ROOT = resolve(__dirname, '../..')

/**
 * Lance l'app buildée (out/) avec un userData temporaire. `userData` peut être fourni pour
 * relancer sur les mêmes données (tests de persistance).
 */
export function appEnv(userData: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v
  delete env['ELECTRON_RENDERER_URL'] // force le chargement de out/renderer
  delete env['ELECTRON_RUN_AS_NODE']
  env['APP_USER_DATA'] = userData
  return env
}

/** Lance l'app sans attendre de fenêtre (ex. 2e instance qui doit s'arrêter). */
export function launchRaw(userData: string): Promise<ElectronApplication> {
  return electron.launch({ args: ['.'], cwd: ROOT, env: appEnv(userData) })
}

export async function launchApp(options: { userData?: string } = {}): Promise<LaunchedApp> {
  const userData = options.userData ?? mkdtempSync(join(tmpdir(), 'church-e2e-'))
  const app = await launchRaw(userData)
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')
  return {
    app,
    window,
    userData,
    close: async () => {
      await app.close()
    }
  }
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}

/** Lien de la barre latérale (évite les ambiguïtés avec les liens du contenu). */
export function navLink(window: Page, name: string): ReturnType<Page['getByRole']> {
  return window
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name, exact: true })
}

/** Cases d'une rangée d'un tableau, désignée par son en-tête de rangée (`label`). */
export function rowCells(scope: Locator, label: string): Locator {
  return scope
    .getByRole('row')
    .filter({ has: scope.page().getByRole('rowheader', { name: label }) })
    .getByRole('cell')
}

/** Montant affiché « 1 370 Ar » (espaces insécables) : expression exacte pour `toHaveText`. */
export function ar(amount: number): RegExp {
  return new RegExp(`^${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '\\s')}\\sAr$`)
}

/** Choisit une date dans le calendrier du champ « Du » ou « Au ». */
export async function pickDate(w: Page, field: 'Du' | 'Au', date: string): Promise<void> {
  await w.getByRole('button', { name: new RegExp(`^${field} `) }).click()
  const calendar = w.getByRole('dialog', { name: 'Choisir une date' })
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number)
  await calendar.getByLabel('Année', { exact: true }).selectOption(String(y))
  await calendar.getByLabel('Mois', { exact: true }).selectOption(String(m - 1))
  const name = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(y, m - 1, d)))
  await calendar.getByRole('button', { name, exact: true }).click()
  await expect(calendar).toHaveCount(0) // fin de l'animation de fermeture
}

/** Champ de description d'une nouvelle sous-rubrique (comptabilité). */
export const newChild = (w: Page, code: string): Locator =>
  w.getByRole('textbox', {
    name: `Description de la nouvelle sous-rubrique ${code}`,
    exact: true
  })

/** Ajoute des sous-rubriques à la suite (le formulaire reste ouvert), puis le ferme. */
export async function addChildren(
  w: Page,
  parent: string,
  items: Array<[string, string]>
): Promise<void> {
  await w
    .getByRole('button', { name: `Ajouter une sous-rubrique à ${parent}`, exact: true })
    .click()
  for (const [code, description] of items) {
    await newChild(w, code).fill(description)
    await newChild(w, code).press('Enter')
  }
  await w.keyboard.press('Escape')
}
