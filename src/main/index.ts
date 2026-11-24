/**
 * Bootstrap du process main : chemins, logger, container, fenêtre. Aucune logique métier.
 */
import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'node:path'
import { createContainer, type Container } from '@main/container'
import { createElectronLogSink } from '@main/logging/electron-log.sink'
import { createLogger } from '@main/logging/logger'

const isDev = !app.isPackaged

const logger = createLogger(
  createElectronLogSink({
    logsDir: join(app.getPath('userData'), 'logs'),
    level: isDev ? 'debug' : 'info',
    console: isDev
  })
)

let container: Container | null = null

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    logger.info({}, 'fenêtre affichée')
  })

  // Liens externes : navigateur système, jamais dans l'app
  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return mainWindow
}

async function start(): Promise<void> {
  app.setAppUserModelId('mg.church.manager')
  logger.info({ version: app.getVersion(), isDev }, 'démarrage')

  container = await createContainer(
    {
      userData: app.getPath('userData'),
      backupsDir: join(app.getPath('documents'), app.getName(), 'Sauvegardes'),
      migrationsFolder: app.isPackaged
        ? join(process.resourcesPath, 'drizzle')
        : join(app.getAppPath(), 'drizzle')
    },
    logger
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

app
  .whenReady()
  .then(start)
  .catch((err: unknown) => {
    logger.error({ err }, 'échec du démarrage')
    dialog.showErrorBox(
      'Church Manager ne peut pas démarrer',
      "Une erreur est survenue à l'ouverture des données. Le détail est enregistré dans le fichier de log."
    )
    app.exit(1)
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  container?.dispose()
})
