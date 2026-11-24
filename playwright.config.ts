import { defineConfig } from '@playwright/test'

/**
 * E2E sur l'app Electron BUILDÉE (`npm run build` avant). Support Electron de Playwright :
 * expérimental, suffisant pour nos parcours. Pas de retry : un test flaky se corrige (par. 9.3).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results'
})
