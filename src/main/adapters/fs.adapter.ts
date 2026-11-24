import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync
} from 'node:fs'
import { join } from 'node:path'

export interface FileEntry {
  name: string
  path: string
  size: number
  modifiedAt: Date
}

/** Accès disque utilisé par les services (sauvegardes…). Remplaçable par un fake en test. */
export interface FsAdapter {
  ensureDir(dir: string): void
  exists(path: string): boolean
  listFiles(dir: string): FileEntry[]
  remove(path: string): void
  copyFile(from: string, to: string): void
  /** Renommage atomique sur un même volume (remplace la cible). */
  rename(from: string, to: string): void
}

export const nodeFs: FsAdapter = {
  ensureDir: (dir) => {
    mkdirSync(dir, { recursive: true })
  },
  exists: (path) => existsSync(path),
  listFiles: (dir) => {
    if (!existsSync(dir)) return []
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => {
        const path = join(dir, d.name)
        const st = statSync(path)
        return { name: d.name, path, size: st.size, modifiedAt: st.mtime }
      })
  },
  remove: (path) => {
    rmSync(path, { force: true })
  },
  copyFile: (from, to) => {
    copyFileSync(from, to)
  },
  rename: (from, to) => {
    renameSync(from, to)
  }
}
