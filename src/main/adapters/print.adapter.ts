import { BrowserWindow } from 'electron'
import type { PrintResultDTO } from '@shared/ipc/contract'

/** Impression de la fenêtre de l'application (boîte de dialogue système, PDF compris). */
export interface PrintAdapter {
  printWindow(): Promise<PrintResultDTO['status']>
}

export const electronPrint: PrintAdapter = {
  printWindow() {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) return Promise.reject(new Error('Aucune fenêtre à imprimer'))
    return new Promise((resolve, reject) => {
      // printBackground : garde les bandeaux de rubrique et la ligne de total
      win.webContents.print({ printBackground: true }, (success, failureReason) => {
        if (success) resolve('printed')
        else if (failureReason === 'cancelled') resolve('cancelled')
        else reject(new Error(`Impression impossible : ${failureReason}`))
      })
    })
  }
}
