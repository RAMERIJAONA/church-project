/**
 * `npm run db:reset` : vide la base de DÉVELOPPEMENT (jamais celle d'un PC installé).
 * Rien n'est effacé : data.db (+ -wal, -shm) est déplacé dans `<userData>/avant-vidage/<date>/`.
 * Au prochain `npm run dev`, l'application crée une base neuve et applique les migrations
 * (même état que le parcours E2E « démarrage à vide »). Les réglages (thème…) repartent aussi
 * à zéro, puisqu'ils sont dans la même base.
 *
 * Cible : `--seed` → .dev-data/seed ; sinon `APP_USER_DATA` s'il est défini ; sinon le dossier
 * userData de `npm run dev` (dérivé de `productName`, comme le fait Electron).
 * Refuse si l'application est ouverte sur ce dossier (fichiers SQLite en cours d'utilisation).
 *
 * Script Node pur (Node 24 exécute le TypeScript directement), sans dépendance.
 */
import { existsSync, mkdirSync, readFileSync, readlinkSync, renameSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const DB_FILES = ['data.db', 'data.db-wal', 'data.db-shm'] as const

/** Dossier `userData` d'Electron pour une app non installée (`app.getPath('userData')`). */
export function defaultUserDataDir(
  productName: string,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  home: string
): string {
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', productName)
  if (platform === 'win32')
    return join(env['APPDATA'] ?? join(home, 'AppData', 'Roaming'), productName)
  return join(env['XDG_CONFIG_HOME'] ?? join(home, '.config'), productName)
}

/**
 * PID de l'instance Electron qui tient le dossier, d'après `SingletonLock` (macOS, Linux :
 * lien symbolique « hôte-pid »). `null` si pas de verrou, verrou périmé ou illisible.
 * Sous Windows le verrou est un fichier ouvert : c'est le renommage qui échouera (EBUSY).
 */
export function runningAppPid(userDataDir: string): number | null {
  let target: string
  try {
    target = readlinkSync(join(userDataDir, 'SingletonLock'))
  } catch {
    return null // pas de lien : aucune instance (ou Windows)
  }
  const pid = Number(target.slice(target.lastIndexOf('-') + 1))
  if (!Number.isInteger(pid) || pid <= 0) return null
  try {
    process.kill(pid, 0) // signal 0 : teste seulement l'existence du process
    return pid
  } catch (err) {
    // EPERM : le process existe mais appartient à un autre utilisateur
    return (err as NodeJS.ErrnoException).code === 'EPERM' ? pid : null
  }
}

export type ResetResult =
  | { status: 'reset'; backupDir: string; moved: string[] }
  | { status: 'already-empty' }
  | { status: 'app-running'; pid: number }

/** Déplace les fichiers de la base dans `avant-vidage/<horodatage>/`. */
export function resetDatabase(userDataDir: string, now: Date): ResetResult {
  const pid = runningAppPid(userDataDir)
  if (pid !== null) return { status: 'app-running', pid }

  const present = DB_FILES.filter((f) => existsSync(join(userDataDir, f)))
  if (!present.includes('data.db')) return { status: 'already-empty' }

  const stamp = now.toISOString().replace(/[:.]/g, '-')
  const backupDir = join(userDataDir, 'avant-vidage', stamp)
  mkdirSync(backupDir, { recursive: true })
  // data.db d'abord : si Windows le refuse (app ouverte), rien n'a bougé
  for (const f of present) renameSync(join(userDataDir, f), join(backupDir, f))
  return { status: 'reset', backupDir, moved: present }
}

function targetDir(argv: string[], env: NodeJS.ProcessEnv): string {
  const root = resolve(import.meta.dirname, '..')
  if (argv.includes('--seed')) return join(root, '.dev-data', 'seed')
  if (env['APP_USER_DATA']) return resolve(env['APP_USER_DATA'])
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    productName: string
  }
  return defaultUserDataDir(pkg.productName, process.platform, env, homedir())
}

function main(): void {
  const dir = targetDir(process.argv.slice(2), process.env)
  let result: ResetResult
  try {
    result = resetDatabase(dir, new Date())
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'EBUSY' || code === 'EPERM') {
      console.error(`Base utilisée par l'application (${code}). Fermez-la, puis relancez.`)
    } else {
      console.error('Échec du vidage de la base :', err)
    }
    process.exitCode = 1
    return
  }
  if (result.status === 'app-running') {
    console.error(
      `L'application est ouverte (pid ${result.pid}) sur ${dir}. Fermez-la, puis relancez.`
    )
    process.exitCode = 1
  } else if (result.status === 'already-empty') {
    console.info(`Aucune base dans ${dir} : rien à vider.`)
  } else {
    console.info(
      `Base vidée : ${dir}\n` +
        `Ancienne base conservée dans ${result.backupDir} (${result.moved.join(', ')}).\n` +
        'Au prochain lancement, l’application repart d’une base vide.'
    )
  }
}

if (import.meta.main) main()
