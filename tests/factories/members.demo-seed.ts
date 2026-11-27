import type { HouseholdsService } from '@main/services/households.service'
import type { MembersService } from '@main/services/members.service'
import type { SectorsService } from '@main/services/sectors.service'
import type { MemberRole } from '@shared/domain/members/households.rules'
import {
  createHouseholdInputSchema,
  updateHouseholdInputSchema
} from '@shared/domain/members/households.types'
import {
  createMemberInputSchema,
  type CreateMemberInput
} from '@shared/domain/members/members.types'
import { createSectorInputSchema } from '@shared/domain/members/sectors.types'
import { utcToCalendarDate } from '@shared/utils/dates'

/**
 * Fidèles FICTIFS de démonstration (`npm run seed:members`) : noms et prénoms fabriqués à partir
 * de syllabes, aucune personne réelle. Indépendant de la comptabilité.
 * Chaque fidèle a un nom ET un prénom qui ne servent qu'à lui (porteur, 2026-11-27) :
 * 12 288 noms et 32 768 prénoms possibles, parcourus avec un pas premier (7 919) pour mélanger.
 * Foyers (porteur, 2026-11-27) : personnes seules, couples, parents seuls, familles jusqu'à 7
 * enfants, répartis sur 8 secteurs ; une cinquantaine de diacres parrainent les foyers, environ
 * un foyer sur dix reste « à désigner ».
 */
export const DEMO_MEMBERS_COUNT = 10_000

const SYLLABLES = [
  'ra',
  'ko',
  'to',
  'ma',
  'la',
  'na',
  'ri',
  'zo',
  'fy',
  'he',
  'ny',
  'ti',
  'so',
  'va',
  'ha',
  'mi'
]
const LAST_PREFIXES = ['RA', 'ANDRIA', 'RAZAFIN', 'RANDRIA', 'RAHERIN', 'RAJAO']
const LAST_ENDINGS = ['NA', 'SOA', 'VELO', 'SON', 'RISOA', 'NIRINA', 'MANANA', 'JAONA']
const FIRST_ENDINGS = ['na', 'ry', 'ja', 'ka', 'zo', 'ny', 'ra', 'ly']
const STEP = 7_919

/** Chiffres de `n` dans une base mixte (`radixes`, du moins au plus significatif). */
function digits(n: number, radixes: readonly number[]): number[] {
  return radixes.map((r) => {
    const d = n % r
    n = Math.floor(n / r)
    return d
  })
}

const S = SYLLABLES.length
const LAST_COUNT = LAST_PREFIXES.length * S * S * LAST_ENDINGS.length
const FIRST_COUNT = S * S * S * FIRST_ENDINGS.length

/** i-ième nom (unique pour i < 12 288) : « RAZAFINKOTOSOA » */
function lastNameOf(i: number): string {
  const [p = 0, a = 0, b = 0, e = 0] = digits((i * STEP) % LAST_COUNT, [
    LAST_PREFIXES.length,
    S,
    S,
    LAST_ENDINGS.length
  ])
  return `${at(LAST_PREFIXES, p)}${at(SYLLABLES, a)}${at(SYLLABLES, b)}${at(LAST_ENDINGS, e)}`.toUpperCase()
}

/** i-ième prénom (unique pour i < 32 768) : « Hamirana » */
function firstNameOf(i: number): string {
  const [a = 0, b = 0, c = 0, e = 0] = digits((i * STEP) % FIRST_COUNT, [
    S,
    S,
    S,
    FIRST_ENDINGS.length
  ])
  const word = `${at(SYLLABLES, a)}${at(SYLLABLES, b)}${at(SYLLABLES, c)}${at(FIRST_ENDINGS, e)}`
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** Noms de secteurs fictifs (dont un composé) */
export const DEMO_SECTORS = [
  'Ambodimanga',
  'Antanety',
  'Morarano',
  'Ambohitsara Avaratra',
  'Ambalakely',
  'Andranomena',
  'Ampasika',
  'Mahatsara'
] as const

const at = <T>(list: readonly T[], n: number): T => list[n % list.length] as T

/**
 * Dates de naissance toutes différentes (porteur, 2026-11-27), parents avant enfants : les
 * parents (n-ième adulte) du 1930-01-01 au 1985-12-31, les enfants du 1986-01-01 au 2020-12-31,
 * chaque plage parcourue avec un pas premier avec sa longueur (7 919) : jamais deux fois le même
 * jour, et bien mélangés.
 */
const DAY = 86_400_000
const ADULT_FROM = Date.UTC(1930, 0, 1)
const CHILD_FROM = Date.UTC(1986, 0, 1)
const ADULT_DAYS = (CHILD_FROM - ADULT_FROM) / DAY
const CHILD_DAYS = (Date.UTC(2021, 0, 1) - CHILD_FROM) / DAY
const BIRTH_STEP = 7_919
const birthDateOf = (n: number, child: boolean): string =>
  utcToCalendarDate(
    new Date(
      child
        ? CHILD_FROM + ((n * BIRTH_STEP) % CHILD_DAYS) * DAY
        : ADULT_FROM + ((n * BIRTH_STEP) % ADULT_DAYS) * DAY
    )
  )
const pad = (n: number, size: number): string => String(n).padStart(size, '0')

export type DemoMember = Omit<CreateMemberInput, 'householdId'> & {
  role: MemberRole
  deacon: boolean
}

export interface DemoHousehold {
  /** Index dans `DEMO_SECTORS` */
  sector: number
  /** `false` : « Parrain à désigner » */
  sponsored: boolean
  members: DemoMember[]
}

/** Rôles du h-ième foyer : seul, couple, mère et deux enfants, parent seul, familles. */
function rolesOf(h: number): MemberRole[] {
  const children = (n: number): MemberRole[] => Array.from({ length: n }, () => 'child')
  switch (h % 10) {
    case 0:
      return ['head']
    case 1:
      return ['father', 'mother']
    case 2:
      return ['mother', ...children(2)]
    case 3:
      return ['head', ...children(1)]
    default:
      return ['father', 'mother', ...children(1 + (h % 7))]
  }
}

/** i-ième fidèle (nom, prénom uniques pour i < 12 288), n-ième adulte ou enfant (date). */
function demoMember(i: number, n: number, role: MemberRole, deacon: boolean): DemoMember {
  const lastName = lastNameOf(i)
  const firstName = firstNameOf(i)
  const baptized = deacon || i % 4 !== 0
  const sex = role === 'father' ? 'M' : role === 'mother' ? 'F' : i % 2 === 0 ? 'M' : 'F'
  return {
    role,
    sex,
    // Saisies volontairement irrégulières : le service les met en forme
    lastName: i % 7 === 0 ? lastName.toLowerCase() : lastName,
    firstName: i % 9 === 0 ? firstName.toUpperCase() : firstName,
    birthDate: birthDateOf(n, role === 'child'),
    address: `Lot ${100 + i}, Ambatondrazaka`,
    phone:
      i % 3 === 0
        ? ''
        : `03${at([2, 3, 4, 8], i)} ${pad((i * 37) % 100, 2)} ${pad((i * 101) % 1000, 3)} ${pad(i % 100, 2)}`,
    baptized,
    communicant: deacon || (baptized && i % 3 !== 1),
    deacon
  }
}

/**
 * Foyers de démonstration pour `count` fidèles, déterministes. Le premier membre d'un foyer
 * sur 45 est diacre ; un foyer sur dix n'a pas de parrain.
 */
export function demoPlan(count: number): DemoHousehold[] {
  const plan: DemoHousehold[] = []
  let i = 0
  let adults = 0
  let kids = 0
  for (let h = 0; i < count; h++) {
    const roles = rolesOf(h).slice(0, count - i)
    const members = roles.map((role, k) => {
      const child = role === 'child'
      const member = demoMember(i, child ? kids : adults, role, k === 0 && h % 45 === 3)
      i++
      if (child) kids++
      else adults++
      return member
    })
    plan.push({ sector: h % DEMO_SECTORS.length, sponsored: h % 10 !== 9, members })
  }
  return plan
}

/**
 * Crée secteurs, foyers et fidèles par les services (normalisation et contrôles réels), puis
 * attribue les parrains quand tous les diacres existent.
 */
export function seedDemoMembers(
  services: { sectors: SectorsService; households: HouseholdsService; members: MembersService },
  count: number = DEMO_MEMBERS_COUNT
): { sectors: number; households: number; members: number } {
  const sectors = DEMO_SECTORS.map((name) =>
    services.sectors.create(createSectorInputSchema.parse({ name }))
  )
  const plan = demoPlan(count)
  const deacons: number[] = []
  const created = plan.map((h) => {
    const sectorId = sectors[h.sector]?.id ?? 0
    const household = services.households.create(createHouseholdInputSchema.parse({ sectorId }))
    for (const m of h.members) {
      const member = services.members.create(
        createMemberInputSchema.parse({ ...m, householdId: household.id })
      )
      if (member.deacon) deacons.push(member.id)
    }
    return { id: household.id, sectorId, sponsored: h.sponsored }
  })
  created.forEach((h, n) => {
    const sponsorId = deacons[(n * 13) % deacons.length]
    if (!h.sponsored || sponsorId === undefined) return
    services.households.update(
      updateHouseholdInputSchema.parse({ id: h.id, sectorId: h.sectorId, sponsorId })
    )
  })
  return { sectors: sectors.length, households: created.length, members: count }
}
