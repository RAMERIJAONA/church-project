import type { MembersService } from '@main/services/members.service'
import {
  createMemberInputSchema,
  type CreateMemberInput
} from '@shared/domain/members/members.types'
import { utcToCalendarDate } from '@shared/utils/dates'

/**
 * Fidèles FICTIFS de démonstration (`npm run seed:members`) : combinaisons déterministes de
 * noms et prénoms courants, aucune personne réelle. Indépendant de la comptabilité.
 * Nom et prénom tous différents (règle du porteur, 2026-11-27) : 40 noms × 25 prénoms × 17
 * (sans second prénom ou l'un des 16) = 17 000 combinaisons possibles.
 */
export const DEMO_MEMBERS_COUNT = 10_000

const LAST_NAMES = [
  'RAKOTO',
  'RASOA',
  'RANDRIA',
  'RABE',
  'RAZAFY',
  'ANDRIAMAHEFA',
  'RAHARISON',
  'RAJAONA',
  'RANAIVO',
  'RAVELO',
  'RAKOTOMALALA',
  'RASOLOFO',
  'RAMANANTSOA',
  'RAZAFINDRAKOTO',
  'RAHERINIAINA',
  'ANDRIANARISOA',
  'RAKOTONDRABE',
  'RAVELOJAONA',
  'RANDRIAMAMPIONONA',
  'RAZANAMPARANY',
  'RASOAMANANA',
  'RAKOTOARISOA',
  'ANDRIANTSOA',
  'RAHARIMANANA',
  'RAMAROSON',
  'RANDRIANASOLO',
  'RAZAFIMAHATRATRA',
  'RABEMANANJARA',
  'RAKOTONIRINA',
  'RAVOLOLONIRINA',
  'RAJAOFERA',
  'RAMIANDRISOA',
  'RANAIVOSON',
  'RAZAKAMANANA',
  'RABEARIVELO',
  'ANDRIAMANANTENA',
  'RASAMOELINA',
  'RAKOTOVAO',
  'RAFANOMEZANTSOA',
  'RANDRIANARIVELO'
]
const FIRST_NAMES = [
  'Tiana',
  'Nirina',
  'Fanja',
  'Andry',
  'Hery',
  'Mamy',
  'Fara',
  'Haja',
  'Lova',
  'Noro',
  'Voahangy',
  'Toky',
  'Miora',
  'Sitraka',
  'Jean-Pierre',
  'Fenitra',
  'Rova',
  'Tsiry',
  'Holy',
  'Naina',
  'Mialy',
  'Faly',
  'Domoina',
  'Tahiry',
  'Onja'
]
const SECOND_NAMES = [
  'Aina',
  'Ny Avo',
  'Lalaina',
  'Hasina',
  'Fitia',
  'Soa',
  'Zo',
  'Riana',
  'Tojo',
  'Vola',
  'Harena',
  'Mahery',
  'Fanantenana',
  'Hanitra',
  'Ando',
  'Iary'
]
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

/** Saisie du i-ième fidèle de démonstration (0 ≤ i < 17 000 : nom et prénom uniques). */
export function demoMemberInput(i: number): CreateMemberInput {
  const lastName = at(LAST_NAMES, i)
  const second =
    Math.floor(i / (LAST_NAMES.length * FIRST_NAMES.length)) % (SECOND_NAMES.length + 1)
  const first = at(FIRST_NAMES, Math.floor(i / LAST_NAMES.length))
  const firstName = second === 0 ? first : `${first} ${at(SECOND_NAMES, second - 1)}`
  const sector = at(SECTORS, i)
  const baptized = i % 4 !== 0
  return {
    // Saisies volontairement irrégulières : le service les met en forme
    lastName: i % 7 === 0 ? lastName.toLowerCase() : lastName,
    firstName: i % 9 === 0 ? firstName.toUpperCase() : firstName,
    birthDate: birthDateOf(i),
    address: `Lot ${100 + i} ${sector}, Ambatondrazaka`,
    phone:
      i % 3 === 0
        ? ''
        : `03${at([2, 3, 4, 8], i)} ${pad((i * 37) % 100, 2)} ${pad((i * 101) % 1000, 3)} ${pad(i % 100, 2)}`,
    sector,
    registrationNumber: `M-${pad(i + 1, 5)}`,
    baptized,
    communicant: baptized && i % 3 !== 1
  }
}

/** Crée `count` fidèles par le service (normalisation et contrôles réels). Renvoie le nombre créé. */
export function seedMembers(service: MembersService, count: number): number {
  for (let i = 0; i < count; i++) service.create(createMemberInputSchema.parse(demoMemberInput(i)))
  return count
}
