import { contextBridge, ipcRenderer } from 'electron'
import { isChannel } from '@shared/ipc/channels'
import type { WindowApi } from './api'

/**
 * Seule API exposée au renderer : `window.api.invoke(canal, entrée)`.
 * Canaux filtrés par liste blanche ; la validation des entrées se fait côté main (zod).
 */
const api: WindowApi = {
  invoke: (channel, input) => {
    if (!isChannel(channel))
      return Promise.reject(new Error(`Canal IPC inconnu : ${String(channel)}`))
    return ipcRenderer.invoke(channel, input)
  }
}

contextBridge.exposeInMainWorld('api', api)
