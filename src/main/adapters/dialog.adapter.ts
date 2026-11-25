import { BrowserWindow, dialog } from 'electron'
import { APP_NAME } from '@shared/domain/identity'

/** Boîtes de dialogue natives, remplaçables par un fake en test. */
export interface DialogAdapter {
  /** Chemin choisi, ou null si annulé. Filtres par défaut : sauvegarde `.db`. */
  chooseSavePath(options: {
    title: string
    defaultPath: string
    filters?: FileFilter[]
  }): Promise<string | null>
  chooseOpenFile(options: { title: string; defaultPath?: string }): Promise<string | null>
  /** Vrai si l'utilisateur confirme. */
  confirm(options: {
    title: string
    message: string
    detail: string
    confirmLabel: string
  }): Promise<boolean>
}

export interface FileFilter {
  name: string
  extensions: string[]
}

const DB_FILTERS: FileFilter[] = [{ name: `Sauvegarde ${APP_NAME}`, extensions: ['db'] }]

function parent(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

export const electronDialog: DialogAdapter = {
  async chooseSavePath({ title, defaultPath, filters = DB_FILTERS }) {
    const win = parent()
    const opts = { title, defaultPath, filters }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    return res.canceled || !res.filePath ? null : res.filePath
  },
  async chooseOpenFile({ title, defaultPath }) {
    const win = parent()
    const opts = {
      title,
      defaultPath,
      filters: DB_FILTERS,
      properties: ['openFile' as const]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    return res.canceled ? null : (res.filePaths[0] ?? null)
  },
  async confirm({ title, message, detail, confirmLabel }) {
    const win = parent()
    const opts = {
      type: 'warning' as const,
      title,
      message,
      detail,
      buttons: [confirmLabel, 'Annuler'],
      defaultId: 1,
      cancelId: 1,
      noLink: true
    }
    const res = win ? await dialog.showMessageBox(win, opts) : await dialog.showMessageBox(opts)
    return res.response === 0
  }
}
