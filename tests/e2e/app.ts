import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
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
