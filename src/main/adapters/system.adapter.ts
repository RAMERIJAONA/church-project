import { app, shell } from 'electron'

/** Actions système : ouvrir un dossier, redémarrer l'app. */
export interface SystemAdapter {
  openFolder(path: string): Promise<void>
  /** Redémarre l'application (après la réponse IPC en cours). */
  scheduleRelaunch(): void
}

export const electronSystem: SystemAdapter = {
  async openFolder(path) {
    const error = await shell.openPath(path)
    if (error) throw new Error(`Ouverture du dossier impossible (${path}) : ${error}`)
  },
  scheduleRelaunch() {
    // Laisse le temps à la réponse IPC de partir
    setTimeout(() => {
      app.relaunch()
      app.exit(0)
    }, 300)
  }
}
