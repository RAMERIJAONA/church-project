import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultUserDataDir, resetDatabase } from '../../scripts/db-reset'

const NOW = new Date('2026-11-25T10:00:00.000Z')
let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'db-reset-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('npm run db:reset', () => {
  it('déplace data.db, -wal et -shm dans avant-vidage sans rien effacer', () => {
    for (const f of ['data.db', 'data.db-wal', 'data.db-shm']) writeFileSync(join(dir, f), f)

    const result = resetDatabase(dir, NOW)

    const backupDir = join(dir, 'avant-vidage', '2026-11-25T10-00-00-000Z')
    expect(result).toEqual({
      status: 'reset',
      backupDir,
      moved: ['data.db', 'data.db-wal', 'data.db-shm']
    })
    expect(existsSync(join(dir, 'data.db'))).toBe(false)
    expect(existsSync(join(backupDir, 'data.db'))).toBe(true)
    expect(existsSync(join(backupDir, 'data.db-wal'))).toBe(true)
  })

  it('ne fait rien si aucune base n’existe', () => {
    expect(resetDatabase(dir, NOW)).toEqual({ status: 'already-empty' })
    expect(existsSync(join(dir, 'avant-vidage'))).toBe(false)
  })

  it.skipIf(process.platform === 'win32')('refuse si l’application est ouverte', () => {
    writeFileSync(join(dir, 'data.db'), 'x')
    symlinkSync(`hote-${process.pid}`, join(dir, 'SingletonLock')) // process vivant

    expect(resetDatabase(dir, NOW)).toEqual({ status: 'app-running', pid: process.pid })
    expect(existsSync(join(dir, 'data.db'))).toBe(true)
  })

  it.skipIf(process.platform === 'win32')('ignore un verrou périmé (application fermée)', () => {
    writeFileSync(join(dir, 'data.db'), 'x')
    symlinkSync('hote-999999999', join(dir, 'SingletonLock'))

    expect(resetDatabase(dir, NOW).status).toBe('reset')
  })

  it('retrouve le dossier userData de npm run dev selon le système', () => {
    expect(defaultUserDataDir('App', 'darwin', {}, '/Users/u')).toBe(
      '/Users/u/Library/Application Support/App'
    )
    expect(defaultUserDataDir('App', 'win32', { APPDATA: 'C:/R' }, 'C:/u')).toBe(
      join('C:/R', 'App')
    )
    expect(defaultUserDataDir('App', 'linux', {}, '/home/u')).toBe('/home/u/.config/App')
  })
})
