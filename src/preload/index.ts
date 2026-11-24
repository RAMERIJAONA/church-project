import { contextBridge } from 'electron'

// API exposée au renderer : rien d'autre que window.api (CLAUDE.md par. 4.1).
const api = {}

contextBridge.exposeInMainWorld('api', api)
