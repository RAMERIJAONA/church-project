import { expect, test } from '@playwright/test'
import { launchApp, launchRaw, removeDir } from './app'

test('une 2e instance sur les mêmes données s’arrête et laisse la 1re seule', async () => {
  const first = await launchApp()
  try {
    // La 2e instance quitte si vite que Playwright peut échouer pendant le lancement lui-même
    const outcome = await launchRaw(first.userData).then(
      async (second) => {
        await second.waitForEvent('close', { timeout: 15_000 })
        return 'fermée'
      },
      (err: unknown) => (String(err).includes('has been closed') ? 'fermée' : String(err))
    )
    expect(outcome).toBe('fermée')
    expect(first.app.windows()).toHaveLength(1)
    await expect(first.window.getByRole('heading', { level: 1 })).toBeVisible()
  } finally {
    await first.close()
    removeDir(first.userData)
  }
})
