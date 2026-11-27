import { describe, expect, it } from 'vitest'
import {
  birthDateError,
  normalizeFirstName,
  normalizeLastName
} from '@shared/domain/members/members.rules'
import {
  DEMO_MEMBERS_COUNT,
  demoMemberInput,
  seedMembers
} from '@tests/factories/members.demo-seed'
import { setupMembers } from '@tests/helpers/members-context'

function setup() {
  const ctx = setupMembers()
  return { ...ctx, service: ctx.membersService, householdId: ctx.household().id }
}

describe('fidèles de démonstration', () => {
  it('prévoit 10 000 fidèles aux noms et prénoms tous différents', () => {
    expect(DEMO_MEMBERS_COUNT).toBe(10_000)
    const names = new Set(
      Array.from({ length: DEMO_MEMBERS_COUNT }, (_, i) => {
        const m = demoMemberInput(i, 1)
        return `${m.lastName.toUpperCase()}|${m.firstName.toLowerCase()}`
      })
    )
    expect(names.size).toBe(DEMO_MEMBERS_COUNT)
  })

  it('donne à chaque fidèle un nom et un prénom qui ne servent qu’à lui', () => {
    const inputs = Array.from({ length: DEMO_MEMBERS_COUNT }, (_, i) => demoMemberInput(i, 1))
    expect(new Set(inputs.map((m) => normalizeLastName(m.lastName))).size).toBe(DEMO_MEMBERS_COUNT)
    expect(new Set(inputs.map((m) => normalizeFirstName(m.firstName))).size).toBe(
      DEMO_MEMBERS_COUNT
    )
  })

  it('donne une date de naissance différente et valide à chaque fidèle', () => {
    const dates = Array.from(
      { length: DEMO_MEMBERS_COUNT },
      (_, i) => demoMemberInput(i, 1).birthDate
    )
    expect(new Set(dates).size).toBe(DEMO_MEMBERS_COUNT)
    expect(dates.filter((d) => birthDateError(d, '2026-11-27') !== null)).toEqual([])
  })

  it('crée le nombre demandé de fidèles fictifs, par le service', () => {
    const { service, handle, householdId, list } = setup()
    expect(seedMembers(service, 120, householdId)).toBe(120)
    expect(list().total).toBe(120)
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
    seedMembers(a.service, 30, a.householdId)
    seedMembers(b.service, 30, b.householdId)
    const names = (s: typeof a) => s.list().items.map((m) => `${m.lastName} ${m.firstName}`)
    expect(names(a)).toEqual(names(b))
  })
})
