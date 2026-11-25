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

/** Marge des 4 côtés, en px CSS (= @page de styles/print.css). */
export const PRINT_MARGIN_PX = 64
const MARGIN_INCHES = PRINT_MARGIN_PX / 96

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
      // Pas de fond imprimé : tout en blanc (demande du porteur, 2026-11-25 ; print.css aussi)
      const m = PRINT_MARGIN_PX
      const margins = { marginType: 'custom', top: m, bottom: m, left: m, right: m } as const
      win.webContents.print({ printBackground: false, margins }, (success, failureReason) => {
        if (success) resolve('printed')
        else if (failureReason === 'cancelled') resolve('cancelled')
        else reject(new Error(`Impression impossible : ${failureReason}`))
      })
    })
  },
  async savePdf(path) {
    const pdf = await window().webContents.printToPDF({
      printBackground: false,
      preferCSSPageSize: true, // format A4 de @page (print.css)
      margins: {
        top: MARGIN_INCHES,
        bottom: MARGIN_INCHES,
        left: MARGIN_INCHES,
        right: MARGIN_INCHES
      }
    })
    await writeFile(path, pdf)
  }
}
