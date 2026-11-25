import { writeFile } from 'node:fs/promises'
import { BrowserWindow } from 'electron'

/** Impression de la fenêtre de l'application. Remplaçable par un fake en test. */
export interface PrintAdapter {
  /** Faux si aucune imprimante n'est installée (Chromium refuse alors d'imprimer). */
  hasPrinters(): Promise<boolean>
  /** Boîte de dialogue d'impression du système. */
  print(): Promise<'printed' | 'cancelled'>
  /** Écrit la page en PDF A4, même mise en page que l'impression (print.css). */
  savePdf(path: string): Promise<void>
}

function window(): BrowserWindow {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  if (!win) throw new Error('Aucune fenêtre à imprimer')
  return win
}

export const electronPrint: PrintAdapter = {
  async hasPrinters() {
    return (await window().webContents.getPrintersAsync()).length > 0
  },
  print() {
    const win = window()
    return new Promise((resolve, reject) => {
      // printBackground : garde les bandeaux de rubrique et la ligne de total
      win.webContents.print({ printBackground: true }, (success, failureReason) => {
        if (success) resolve('printed')
        else if (failureReason === 'cancelled') resolve('cancelled')
        else reject(new Error(`Impression impossible : ${failureReason}`))
      })
    })
  },
  async savePdf(path) {
    const pdf = await window().webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true // format et marges de @page (print.css)
    })
    await writeFile(path, pdf)
  }
}
