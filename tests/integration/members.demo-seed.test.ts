import { describe, expect, it } from 'vitest'
import {
  birthDateError,
  normalizeFirstName,
  normalizeLastName
} from '@shared/domain/members/members.rules'
import {
  DEMO_MEMBERS_COUNT,
  DEMO_SECTORS,
  demoPlan,
  seedDemoMembers
} from '@tests/factories/members.demo-seed'
import { setupMembers } from '@tests/helpers/members-context'

function seed(count: number) {
  const ctx = setupMembers()
  const result = seedDemoMembers(
    { sectors: ctx.sectorsService, households: ctx.householdsService, members: ctx.membersService },
    count
  )
  return { ...ctx, result }
}

describe('fidèles de démonstration : plan', () => {
  const plan = demoPlan(DEMO_MEMBERS_COUNT)
  const members = plan.flatMap((h) => h.members)

  it('prévoit 10 000 fidèles aux noms et prénoms qui ne servent qu’à eux', () => {
    expect(members).toHaveLength(DEMO_MEMBERS_COUNT)
    expect(new Set(members.map((m) => normalizeLastName(m.lastName))).size).toBe(DEMO_MEMBERS_COUNT)
    expect(new Set(members.map((m) => normalizeFirstName(m.firstName))).size).toBe(
      DEMO_MEMBERS_COUNT
    )
  })

  it('donne une date de naissance différente et valide à chaque fidèle, parents avant enfants', () => {
    const dates = members.map((m) => m.birthDate)
    expect(new Set(dates).size).toBe(DEMO_MEMBERS_COUNT)
    expect(dates.filter((d) => birthDateError(d, '2026-11-27') !== null)).toEqual([])
    const latestParent = members
      .filter((m) => m.role !== 'child')
      .reduce((max, m) => (m.birthDate > max ? m.birthDate : max), '')
    const earliestChild = members
      .filter((m) => m.role === 'child')
      .reduce((min, m) => (m.birthDate < min ? m.birthDate : min), '9999')
    expect(latestParent < earliestChild).toBe(true)
  })

  it('mélange personnes seules, couples, parents seuls et familles nombreuses', () => {
    const shapes = new Set(plan.map((h) => h.members.map((m) => m.role).join(',')))
    expect(shapes.has('head')).toBe(true)
    expect(shapes.has('father,mother')).toBe(true)
    expect(shapes.has('mother,child,child')).toBe(true)
    expect(Math.max(...plan.map((h) => h.members.length))).toBe(9)
    expect(plan.length).toBeGreaterThan(2_000)
    expect(plan.length).toBeLessThan(3_000)
  })

  it('prévoit une cinquantaine de diacres et des foyers sans parrain', () => {
    const deacons = members.filter((m) => m.deacon).length
    expect(deacons).toBeGreaterThanOrEqual(40)
    expect(deacons).toBeLessThanOrEqual(60)
    expect(plan.filter((h) => !h.sponsored).length / plan.length).toBeCloseTo(0.1, 1)
  })
})

describe('fidèles de démonstration : création par les services', () => {
  it('crée secteurs, foyers et fidèles cohérents', () => {
    const { result, list, sectorsService, householdsService, listHouseholds } = seed(300)
    expect(sectorsService.list().map((s) => s.name)).toEqual([...DEMO_SECTORS])
    expect(result.members).toBe(300)
    expect(list().total).toBe(300)
    const all = list({ pageSize: 100 }).items.concat(
      list({ pageSize: 100, page: 2 }).items,
      list({ pageSize: 100, page: 3 }).items
    )
    expect(new Set(all.map((m) => m.matricule)).size).toBe(300)
    const households = listHouseholds({ pageSize: 100 })
    expect(households.total).toBe(result.households)
    expect(households.items.some((h) => h.sponsor === null)).toBe(true)
    for (const h of households.items.filter((x) => x.sponsor !== null)) {
      const sponsor = all.find((m) => m.id === h.sponsor?.id)
      expect(sponsor?.deacon).toBe(true)
    }
    expect(householdsService.get(households.items[0]!.id).members.length).toBeGreaterThan(0)
  })

  it('donne toujours les mêmes fidèles', () => {
    const names = (s: ReturnType<typeof seed>) =>
      s.list().items.map((m) => `${m.matricule} ${m.lastName} ${m.firstName}`)
    expect(names(seed(40))).toEqual(names(seed(40)))
  })
})
