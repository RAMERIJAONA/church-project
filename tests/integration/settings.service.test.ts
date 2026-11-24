import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createSettingsRepository } from '@main/repositories/settings.repository'
import { createSettingsService } from '@main/services/settings.service'
import { DEFAULT_SETTINGS } from '@shared/domain/settings/settings.rules'
import { createTestDb } from '@tests/helpers/test-db'

function setup() {
  const handle = createTestDb()
  const clock = createFixedClock(new Date('2026-11-24T09:00:00.000Z'))
  const sink = createMemorySink()
  const service = createSettingsService({
    db: handle.db,
    settings: createSettingsRepository(),
    clock,
    logger: createLogger(sink)
  })
  return { handle, clock, sink, service }
}

describe('SettingsService', () => {
  it('renvoie les valeurs par défaut sur une base neuve', () => {
    expect(setup().service.get()).toEqual(DEFAULT_SETTINGS)
  })

  it('persiste un patch partiel sans toucher aux autres clés', () => {
    const { service } = setup()
    service.update({ accent: 'green' })
    const res = service.update({ theme: 'dark' })
    expect(res).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', accent: 'green' })
    expect(service.get()).toEqual(res)
  })

  it("horodate en UTC ISO avec l'horloge injectée", () => {
    const { service, handle, clock } = setup()
    service.update({ theme: 'dark' })
    clock.set(new Date('2026-11-25T10:30:00.000Z'))
    service.update({ theme: 'light' })
    const row = handle.sqlite
      .prepare("SELECT updated_at FROM settings WHERE key = 'theme'")
      .pluck()
      .get()
    expect(row).toBe('2026-11-25T10:30:00.000Z')
  })

  it('ignore une valeur corrompue en base et le signale dans les logs', () => {
    const { service, handle, sink } = setup()
    handle.sqlite.exec(
      "INSERT INTO settings (key, value, updated_at) VALUES ('theme', 'oops', '2026-11-24T09:00:00.000Z')"
    )
    expect(service.get().theme).toBe(DEFAULT_SETTINGS.theme)
    expect(sink.entries.some((e) => e.level === 'warn')).toBe(true)
  })
})
