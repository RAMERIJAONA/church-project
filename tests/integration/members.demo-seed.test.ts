import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createMembersRepository } from '@main/repositories/members.repository'
import { createMembersService } from '@main/services/members.service'
import { listMembersInputSchema } from '@shared/domain/members/members.types'
import { seedMembers } from '@tests/factories/members.demo-seed'
import { createTestDb } from '@tests/helpers/test-db'

function setup() {
  const handle = createTestDb()
  const service = createMembersService({
    db: handle.db,
    members: createMembersRepository(),
    clock: createFixedClock(new Date('2026-11-27T09:00:00.000Z')),
    logger: createLogger(createMemorySink())
  })
  return { handle, service }
}

describe('fidèles de démonstration', () => {
  it('crée le nombre demandé de fidèles fictifs, par le service', () => {
    const { service, handle } = setup()
    expect(seedMembers(service, 120)).toBe(120)
    expect(service.list(listMembersInputSchema.parse({})).total).toBe(120)
    const noPhone = handle.sqlite
      .prepare('SELECT count(*) FROM members WHERE phone IS NULL')
      .pluck()
      .get() as number
    expect(noPhone).toBeGreaterThan(0)
    const communicantNotBaptized = handle.sqlite
      .prepare('SELECT count(*) FROM members WHERE communicant = 1 AND baptized = 0')
      .pluck()
      .get()
    expect(communicantNotBaptized).toBe(0)
  })

  it('donne toujours les mêmes fidèles', () => {
    const a = setup()
    const b = setup()
    seedMembers(a.service, 30)
    seedMembers(b.service, 30)
    const names = (s: typeof a) =>
      s.service
        .list(listMembersInputSchema.parse({}))
        .items.map((m) => `${m.lastName} ${m.firstName}`)
    expect(names(a)).toEqual(names(b))
  })
})
