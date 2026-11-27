import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createMembersRepository } from '@main/repositories/members.repository'
import { createMembersService } from '@main/services/members.service'
import {
  birthDateError,
  normalizeFirstName,
  normalizeLastName
} from '@shared/domain/members/members.rules'
import { listMembersInputSchema } from '@shared/domain/members/members.types'
import {
  DEMO_MEMBERS_COUNT,
  demoMemberInput,
  seedMembers
} from '@tests/factories/members.demo-seed'
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
  it('prévoit 10 000 fidèles aux noms et prénoms tous différents', () => {
    expect(DEMO_MEMBERS_COUNT).toBe(10_000)
    const names = new Set(
      Array.from({ length: DEMO_MEMBERS_COUNT }, (_, i) => {
        const m = demoMemberInput(i)
        return `${m.lastName.toUpperCase()}|${m.firstName.toLowerCase()}`
      })
    )
    expect(names.size).toBe(DEMO_MEMBERS_COUNT)
  })

  it('donne à chaque fidèle un nom et un prénom qui ne servent qu’à lui', () => {
    const inputs = Array.from({ length: DEMO_MEMBERS_COUNT }, (_, i) => demoMemberInput(i))
    expect(new Set(inputs.map((m) => normalizeLastName(m.lastName))).size).toBe(DEMO_MEMBERS_COUNT)
    expect(new Set(inputs.map((m) => normalizeFirstName(m.firstName))).size).toBe(
      DEMO_MEMBERS_COUNT
    )
  })

  it('donne une date de naissance différente et valide à chaque fidèle', () => {
    const dates = Array.from({ length: DEMO_MEMBERS_COUNT }, (_, i) => demoMemberInput(i).birthDate)
    expect(new Set(dates).size).toBe(DEMO_MEMBERS_COUNT)
    expect(dates.filter((d) => birthDateError(d, '2026-11-27') !== null)).toEqual([])
  })

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
