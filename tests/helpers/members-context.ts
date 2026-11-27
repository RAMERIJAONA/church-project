/**
 * Contexte de test des fidèles : vraie SQLite en mémoire, vrais services, entrées passées par
 * les schémas zod comme le fait le handler IPC. Données fictives.
 */
import { createFixedClock } from '@main/adapters/clock.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createHouseholdsRepository } from '@main/repositories/households.repository'
import { createMembersRepository } from '@main/repositories/members.repository'
import { createSectorsRepository } from '@main/repositories/sectors.repository'
import { createMembersService } from '@main/services/members.service'
import { createSectorsService } from '@main/services/sectors.service'
import { AppError } from '@shared/domain/errors'
import { nextNumber } from '@shared/domain/members/sectors.rules'
import {
  createMemberInputSchema,
  listMembersInputSchema,
  moveMemberInputSchema,
  updateMemberInputSchema,
  type CreateMemberInput,
  type ListMembersInput,
  type MemberDTO,
  type MoveMemberInput
} from '@shared/domain/members/members.types'
import { createSectorInputSchema } from '@shared/domain/members/sectors.types'
import { makeMemberInput } from '@tests/factories/members.factory'
import { createTestDb } from '@tests/helpers/test-db'

export function setupMembers() {
  const handle = createTestDb()
  const clock = createFixedClock(new Date('2026-11-27T09:00:00.000Z'))
  const logger = createLogger(createMemorySink())
  const repos = {
    sectors: createSectorsRepository(),
    households: createHouseholdsRepository(),
    members: createMembersRepository()
  }
  const sectorsService = createSectorsService({
    db: handle.db,
    sectors: repos.sectors,
    clock,
    logger
  })
  const membersService = createMembersService({
    db: handle.db,
    members: repos.members,
    households: repos.households,
    clock,
    logger
  })

  const sector = (name = 'Ambodimanga') =>
    sectorsService.create(createSectorInputSchema.parse({ name }))

  /** Foyer écrit par le repository (le service des foyers vient en Tâche 5). */
  const household = (opts: { sectorId?: number; sponsorId?: number | null } = {}) => {
    const sectorId = opts.sectorId ?? sectorsService.list()[0]?.id ?? sector().id
    const number = nextNumber(repos.households.maxNumber(handle.db))
    const id = repos.households.insert(handle.db, {
      number,
      sectorId,
      sponsorId: opts.sponsorId ?? null,
      createdAt: clock().toISOString()
    })
    return { id, number }
  }

  const member = (householdId: number, input: Partial<CreateMemberInput> = {}): MemberDTO =>
    membersService.create(createMemberInputSchema.parse(makeMemberInput({ householdId, ...input })))

  const update = (m: MemberDTO, changes: Partial<CreateMemberInput> = {}): MemberDTO =>
    membersService.update(updateMemberInputSchema.parse({ ...toInput(m), ...changes, id: m.id }))

  const move = (input: MoveMemberInput): MemberDTO =>
    membersService.move(moveMemberInputSchema.parse(input))

  const list = (input: ListMembersInput = {}) =>
    membersService.list(listMembersInputSchema.parse(input))

  return {
    handle,
    clock,
    logger,
    repos,
    sectorsService,
    membersService,
    sector,
    household,
    member,
    update,
    move,
    list
  }
}

/** Fiche d'un fidèle renvoyée telle quelle au service (modification sans changement). */
export function toInput(m: MemberDTO): Omit<CreateMemberInput, 'householdId'> {
  return {
    role: m.role,
    sex: m.sex,
    lastName: m.lastName,
    firstName: m.firstName,
    birthDate: m.birthDate,
    address: m.address,
    phone: m.phone,
    baptized: m.baptized,
    communicant: m.communicant,
    deacon: m.deacon
  }
}

export function caught(fn: () => unknown): AppError {
  try {
    fn()
  } catch (err) {
    if (err instanceof AppError) return err
    throw err
  }
  throw new Error('aucune erreur levée')
}
