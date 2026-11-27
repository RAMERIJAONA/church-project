import type { MembersService } from '@main/services/members.service'
import { createMemberInputSchema } from '@shared/domain/members/members.types'

/**
 * Fidèles FICTIFS de démonstration (`npm run seed:members`) : combinaisons déterministes de
 * noms et prénoms courants, aucune personne réelle. Indépendant de la comptabilité.
 */
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
  'RAHERINIAINA'
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
  'Marie Claire',
  'Fenitra',
  'Rova'
]
const SECTORS = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre']

const pick = <T>(list: readonly T[], n: number): T => list[n % list.length] as T
const pad = (n: number, size: number): string => String(n).padStart(size, '0')

/** Crée `count` fidèles par le service (normalisation et contrôles réels). Renvoie le nombre créé. */
export function seedMembers(service: MembersService, count: number): number {
  for (let i = 0; i < count; i++) {
    const baptized = i % 4 !== 0
    const lastName = pick(LAST_NAMES, i * 7 + Math.floor(i / 15))
    const sector = pick(SECTORS, i)
    service.create(
      createMemberInputSchema.parse({
        // Saisies volontairement irrégulières : le service les met en forme
        lastName: i % 7 === 0 ? lastName.toLowerCase() : lastName,
        firstName: i % 9 === 0 ? pick(FIRST_NAMES, i * 5).toUpperCase() : pick(FIRST_NAMES, i * 5),
        birthDate: `${1935 + ((i * 7) % 85)}-${pad(1 + (i % 12), 2)}-${pad(1 + ((i * 3) % 28), 2)}`,
        address: `Lot ${100 + i} ${sector}, Ambatondrazaka`,
        phone:
          i % 3 === 0
            ? ''
            : `03${pick([2, 3, 4, 8], i)} ${pad((i * 37) % 100, 2)} ${pad((i * 101) % 1000, 3)} ${pad(i % 100, 2)}`,
        sector,
        registrationNumber: `M-${pad(i + 1, 4)}`,
        baptized,
        communicant: baptized && i % 3 !== 1,
        // Homonymes possibles (et quelques doublons) : enregistrés sans question
        confirmDuplicate: true
      })
    )
  }
  return count
}
