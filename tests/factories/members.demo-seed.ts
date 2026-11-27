import type { MembersService } from '@main/services/members.service'
import {
  createMemberInputSchema,
  type CreateMemberInput
} from '@shared/domain/members/members.types'
import { utcToCalendarDate } from '@shared/utils/dates'

/**
 * Fidèles FICTIFS de démonstration (`npm run seed:members`) : noms et prénoms fabriqués à partir
 * de syllabes, aucune personne réelle. Indépendant de la comptabilité.
 * Chaque fidèle a un nom ET un prénom qui ne servent qu'à lui (porteur, 2026-11-27) :
 * 12 288 noms et 32 768 prénoms possibles, parcourus avec un pas premier (7 919) pour mélanger.
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

const SECTORS = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre']

const at = <T>(list: readonly T[], n: number): T => list[n % list.length] as T

/**
 * Dates de naissance toutes différentes (porteur, 2026-11-27) : jours du 1930-01-01 au
 * 2020-12-31 (33 237), parcourus avec un pas premier avec ce nombre (7 919) : jamais deux fois
 * le même jour pour i < 33 237, et bien mélangés.
 */
const FIRST_BIRTH_DAY = Date.UTC(1930, 0, 1)
const BIRTH_DAYS = (Date.UTC(2021, 0, 1) - FIRST_BIRTH_DAY) / 86_400_000
const BIRTH_STEP = 7_919
const birthDateOf = (i: number): string =>
  utcToCalendarDate(new Date(FIRST_BIRTH_DAY + ((i * BIRTH_STEP) % BIRTH_DAYS) * 86_400_000))
const pad = (n: number, size: number): string => String(n).padStart(size, '0')

/** Saisie du i-ième fidèle de démonstration (nom, prénom et date uniques pour i < 12 288). */
export function demoMemberInput(i: number, householdId: number): CreateMemberInput {
  const lastName = lastNameOf(i)
  const firstName = firstNameOf(i)
  const baptized = i % 4 !== 0
  return {
    householdId,
    role: 'child',
    sex: i % 2 === 0 ? 'M' : 'F',
    // Saisies volontairement irrégulières : le service les met en forme
    lastName: i % 7 === 0 ? lastName.toLowerCase() : lastName,
    firstName: i % 9 === 0 ? firstName.toUpperCase() : firstName,
    birthDate: birthDateOf(i),
    address: `Lot ${100 + i} ${at(SECTORS, i)}, Ambatondrazaka`,
    phone:
      i % 3 === 0
        ? ''
        : `03${at([2, 3, 4, 8], i)} ${pad((i * 37) % 100, 2)} ${pad((i * 101) % 1000, 3)} ${pad(i % 100, 2)}`,
    baptized,
    communicant: baptized && i % 3 !== 1
  }
}

/**
 * Crée `count` fidèles par le service (normalisation et contrôles réels), tous dans le foyer
 * `householdId` (provisoire : foyers et secteurs de démonstration à venir). Renvoie le nombre créé.
 */
export function seedMembers(service: MembersService, count: number, householdId: number): number {
  for (let i = 0; i < count; i++) {
    service.create(createMemberInputSchema.parse(demoMemberInput(i, householdId)))
  }
  return count
}
