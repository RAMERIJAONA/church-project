/**
 * Bootstrap du process main : chemins, logger, container, fenêtre. Aucune logique métier.
 */
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { join, resolve } from 'node:path'
import { electronDialog } from '@main/adapters/dialog.adapter'
import { electronSystem } from '@main/adapters/system.adapter'
import { createContainer, type Container } from '@main/container'
import { electronPrint } from '@main/adapters/print.adapter'
import { registerIpc } from '@main/ipc/register'
import { createElectronLogSink } from '@main/logging/electron-log.sink'
import { createLogger } from '@main/logging/logger'
import { WINDOW_BACKGROUND } from '@main/window-theme'
import { settingsToQuery } from '@shared/domain/settings/settings.theme'
import type { AppSettings } from '@shared/domain/settings/settings.types'
import { APP_NAME } from '@shared/domain/identity'

// Stack traces des logs ramenées au code TypeScript (sourcemaps main/preload)
process.setSourceMapsEnabled(true)

const isDev = !app.isPackaged
/** `--debug` : DevTools (F12) + logs détaillés, y compris dans l'app installée. */
const isDebug = isDev || process.argv.includes('--debug')

// Isolation des tests E2E : dossier de données dédié, JAMAIS dans l'app installée.
// Doit précéder toute lecture de userData (logger compris).
const testUserData = process.env['APP_USER_DATA']
if (!app.isPackaged && testUserData) app.setPath('userData', resolve(testUserData))

const logsDir = join(app.getPath('userData'), 'logs')
const logger = createLogger(
  createElectronLogSink({ logsDir, level: isDebug ? 'debug' : 'info', console: isDev })
)

// Erreurs non rattrapées du process main : jamais silencieuses
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'exception non gérée (main)')
  dialog.showErrorBox(
    `${APP_NAME} a rencontré une erreur`,
    'Une erreur inattendue est survenue. Le détail est enregistré dans le fichier de log. Si le problème persiste, redémarrez l’application.'
  )
})
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'promesse rejetée non gérée (main)')
})

let container: Container | null = null
let mainWindow: BrowserWindow | null = null

function createWindow(settings: AppSettings): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: WINDOW_BACKGROUND[settings.theme],
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDebug
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    logger.info({}, 'fenêtre affichée')
  })

  const wc = win.webContents
  // Erreurs du renderer → fichier de log (sinon invisibles sur le PC de l'utilisateur)
  wc.on('preload-error', (_e, path, err) => logger.error({ path, err }, 'erreur du preload'))
  wc.on('did-fail-load', (_e, code, description, url) =>
    logger.error({ code, description, url }, 'échec de chargement du renderer')
  )
  wc.on('render-process-gone', (_e, details) =>
    logger.error({ ...details }, 'process renderer arrêté')
  )
  wc.on('console-message', (event) => {
    if (event.level === 'error') {
      logger.error({ source: event.sourceId, line: event.lineNumber }, `renderer: ${event.message}`)
    }
  })
  // F12 en mode debug uniquement
  wc.on('before-input-event', (event, input) => {
    if (isDebug && input.type === 'keyDown' && input.key === 'F12') {
      wc.toggleDevTools()
      event.preventDefault()
    }
  })

  // Liens externes : navigateur système, jamais dans l'app
  wc.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })
  // Aucune navigation hors de l'app (le HashRouter ne change que le fragment)
  const devUrl = isDev ? process.env['ELECTRON_RENDERER_URL'] : undefined
  wc.on('will-navigate', (event, url) => {
    const allowed = url.startsWith('file:') || (devUrl !== undefined && url.startsWith(devUrl))
    if (!allowed) {
      event.preventDefault()
      logger.warn({ url }, 'navigation bloquée')
    }
  })

  const query = settingsToQuery(settings)
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    const url = new URL(process.env['ELECTRON_RENDERER_URL'])
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
    void win.loadURL(url.toString())
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { query })
  }
  return win
}

/** Menu natif minimal : aucun sous Windows ; Édition sur macOS (copier/coller). */
function setupMenu(): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
    return
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
  )
}

async function start(): Promise<void> {
  app.setAppUserModelId('mg.church.manager')
  logger.info({ version: app.getVersion(), isDev, isDebug }, 'démarrage')
  setupMenu()

  const documentsDir = app.getPath('documents')
  container = await createContainer(
    {
      userData: app.getPath('userData'),
      logsDir,
      documentsDir,
      // En test E2E, les sauvegardes restent dans le dossier temporaire (pas dans Documents)
      backupsDir:
        testUserData && !app.isPackaged
          ? join(testUserData, 'Sauvegardes')
          : join(documentsDir, app.getName(), 'Sauvegardes'),
      migrationsFolder: app.isPackaged
        ? join(process.resourcesPath, 'drizzle')
        : join(app.getAppPath(), 'drizzle')
    },
    logger,
    { dialog: electronDialog, system: electronSystem }
  )
  const services = container

  registerIpc(ipcMain, logger, {
    appInfo: { name: app.getName(), version: app.getVersion(), isDebug },
    print: () => electronPrint.printWindow(),
    settings: services.settings,
    maintenance: services.maintenance,
    accounting: services.accounting
  })

  const openWindow = (): void => {
    mainWindow = createWindow(services.settings.get())
    mainWindow.on('closed', () => {
      mainWindow = null
    })
  }
  openWindow()

  // Sauvegarde automatique (> 24 h) : après l'ouverture de la fenêtre, sans bloquer
  setTimeout(() => {
    services.maintenance
      .runStartupBackup()
      .then((b) => b && logger.info({ file: b.fileName }, 'sauvegarde automatique'))
      .catch((err: unknown) => logger.error({ err }, 'échec de la sauvegarde automatique'))
  }, 2000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow()
  })
}

// Une seule instance : deux process sur la même base = risque de corruption
if (!app.requestSingleInstanceLock()) {
  logger.info({}, 'instance déjà ouverte : arrêt')
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app
    .whenReady()
    .then(start)
    .catch((err: unknown) => {
      logger.error({ err }, 'échec du démarrage')
      dialog.showErrorBox(
        `${APP_NAME} ne peut pas démarrer`,
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
}
