import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { describe, expect, it } from 'vitest'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { AppError } from '@shared/domain/errors'
import { DEFAULT_SETTINGS } from '@shared/domain/settings/settings.rules'
import { createHandle, runHandler } from './handle'

function setup() {
  const sink = createMemorySink()
  return { sink, logger: createLogger(sink) }
}

describe('runHandler', () => {
  it('renvoie ok + data et loggue la durée', async () => {
    const { sink, logger } = setup()
    const res = await runHandler('settings.get', () => DEFAULT_SETTINGS, undefined, logger)
    expect(res).toEqual({ ok: true, data: DEFAULT_SETTINGS })
    expect(sink.entries[0]).toMatchObject({
      level: 'debug',
      context: { channel: 'settings.get', ms: expect.any(Number), reqId: expect.any(String) }
    })
  })

  it("renvoie VALIDATION sans appeler le handler si l'entrée est invalide", async () => {
    const { logger } = setup()
    let called = false
    const res = await runHandler(
      'settings.update',
      () => {
        called = true
        return DEFAULT_SETTINGS
      },
      { theme: 'violet' },
      logger
    )
    expect(called).toBe(false)
    expect(res).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
  })

  it("propage le code et le message d'une AppError", async () => {
    const { logger } = setup()
    const res = await runHandler(
      'settings.get',
      () => {
        throw new AppError('BUSINESS_RULE', 'Règle violée', { why: 'test' })
      },
      undefined,
      logger
    )
    expect(res).toEqual({
      ok: false,
      error: { code: 'BUSINESS_RULE', message: 'Règle violée', details: { why: 'test' } }
    })
  })

  it('masque une erreur inattendue (INTERNAL) mais la loggue avec la stack', async () => {
    const { sink, logger } = setup()
    const res = await runHandler(
      'settings.get',
      () => {
        throw new Error('disque plein')
      },
      undefined,
      logger
    )
    expect(res).toEqual({ ok: false, error: { code: 'INTERNAL', message: 'Erreur inattendue' } })
    const entry = sink.entries.find((e) => e.level === 'error')
    expect(entry?.context['err']).toMatchObject({
      message: 'disque plein',
      stack: expect.any(String)
    })
  })
})

describe('createHandle', () => {
  it('enregistre le canal sur ipcMain et ignore l’event Electron', async () => {
    const { logger } = setup()
    const registered = new Map<string, Parameters<IpcMain['handle']>[1]>()
    const handle = createHandle({ handle: (ch, fn) => void registered.set(ch, fn) }, logger)
    handle('settings.get', () => DEFAULT_SETTINGS)
    const listener = registered.get('settings.get')
    // Event Electron factice : le wrapper ne le lit pas
    const fakeEvent = {} as IpcMainInvokeEvent
    expect(await listener?.(fakeEvent, undefined)).toEqual({ ok: true, data: DEFAULT_SETTINGS })
  })
})
