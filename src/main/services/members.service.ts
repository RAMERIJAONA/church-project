import type { Clock } from '@main/adapters/clock.adapter'
import type { Db, Tx } from '@main/db/client'
import type { Logger } from '@main/logging/logger'
import type { MemberRow, MembersRepository } from '@main/repositories/members.repository'
import { AppError } from '@shared/domain/errors'
import {
  birthDateError,
  communicantError,
  formatBirthDate,
  memberDisplayName,
  normalizeFirstName,
  normalizeLastName,
  parsePhone,
  PHONE_ERROR
} from '@shared/domain/members/members.rules'
import {
  buildSearchIndex,
  isBlankQuery,
  searchMembers,
  type SearchIndex
} from '@shared/domain/members/members.search'
import type {
  CreateMemberParsed,
  ListMembersParsed,
  MemberConflictDetails,
  MemberDTO,
  Paginated,
  UpdateMemberParsed
} from '@shared/domain/members/members.types'
import { localDateOf } from '@shared/utils/dates'

/**
 * Fidèles (porteur, 2026-11-27) : normalisation, contrôles, recherche tolérante aux fautes.
 * L'index de recherche est gardé en mémoire (dérogation justifiée dans le spec, par. 4.1) et
 * reconstruit au besoin après chaque écriture.
 */
export function createMembersService(deps: {
  db: Db
  members: MembersRepository
  clock: Clock
  logger: Logger
}) {
  let index: SearchIndex | null = null

  function searchIndex(): SearchIndex {
    if (index === null) {
      const start = performance.now()
      index = buildSearchIndex(deps.members.searchEntries(deps.db))
      deps.logger.debug(
        { entries: index.entries.length, ms: Math.round(performance.now() - start) },
        'index de recherche des fidèles construit'
      )
    }
    return index
  }

  function conflict(message: string, details: MemberConflictDetails): AppError {
    return new AppError('CONFLICT', message, details)
  }

  /** Normalise et contrôle une saisie ; lève l'erreur à afficher. */
  function prepare(
    tx: Tx,
    input: CreateMemberParsed,
    /** Fidèle modifié (`null` : ajout) */
    current: MemberDTO | null
  ): Omit<MemberRow, 'createdAt' | 'updatedAt'> {
    const exceptId = current?.id
    const lastName = normalizeLastName(input.lastName)
    const firstName = normalizeFirstName(input.firstName)

    const dateError = birthDateError(input.birthDate, localDateOf(deps.clock()))
    if (dateError) throw new AppError('VALIDATION', dateError, { field: 'birthDate' })

    const phone = parsePhone(input.phone ?? '')
    if (!phone.ok) throw new AppError('VALIDATION', PHONE_ERROR, { field: 'phone' })

    const ruleError = communicantError(input.baptized, input.communicant)
    if (ruleError) throw new AppError('BUSINESS_RULE', ruleError)

    if (input.registrationNumber !== null) {
      const owner = deps.members.findByRegistrationNumber(tx, input.registrationNumber, exceptId)
      if (owner) {
        throw conflict(
          `Le matricule ${input.registrationNumber} est déjà attribué à ${memberDisplayName(owner)}.`,
          { reason: 'registration-number-taken', existing: owner }
        )
      }
    }

    // En modification, seulement si nom, prénom ou date de naissance changent : un homonyme
    // déjà accepté n'est pas redemandé à chaque modification (téléphone, adresse…)
    const identityChanged =
      current === null ||
      current.lastName !== lastName ||
      current.firstName !== firstName ||
      current.birthDate !== input.birthDate
    if (!input.confirmDuplicate && identityChanged) {
      const key = { lastName, firstName, birthDate: input.birthDate }
      const [same] = deps.members.findSameIdentity(tx, key, exceptId)
      if (same) {
        throw conflict(
          `Un fidèle ${memberDisplayName(same)} né le ${formatBirthDate(same.birthDate)} existe déjà.`,
          { reason: 'possible-duplicate', existing: same }
        )
      }
    }

    return {
      lastName,
      firstName,
      birthDate: input.birthDate,
      address: input.address,
      phone: phone.value,
      sector: input.sector,
      baptized: input.baptized,
      communicant: input.communicant,
      registrationNumber: input.registrationNumber
    }
  }

  function notFound(id: number): AppError {
    return new AppError('NOT_FOUND', 'Fidèle introuvable.', { id })
  }

  return {
    list(input: ListMembersParsed): Paginated<MemberDTO> {
      const offset = (input.page - 1) * input.pageSize
      const page = { page: input.page, pageSize: input.pageSize }
      if (isBlankQuery(input.search)) {
        return {
          ...page,
          items: deps.members.listPage(deps.db, offset, input.pageSize),
          total: deps.members.count(deps.db)
        }
      }
      const ids = searchMembers(searchIndex(), input.search)
      const pageIds = ids.slice(offset, offset + input.pageSize)
      const byId = new Map(deps.members.findByIds(deps.db, pageIds).map((m) => [m.id, m]))
      const items = pageIds.flatMap((id) => byId.get(id) ?? [])
      return { ...page, items, total: ids.length }
    },

    create(input: CreateMemberParsed): MemberDTO {
      const member = deps.db.transaction((tx) => {
        const now = deps.clock().toISOString()
        return deps.members.insert(tx, {
          ...prepare(tx, input, null),
          createdAt: now,
          updatedAt: now
        })
      })
      index = null
      deps.logger.info({ id: member.id, duplicate: input.confirmDuplicate }, 'fidèle ajouté')
      return member
    },

    update(input: UpdateMemberParsed): MemberDTO {
      const member = deps.db.transaction((tx) => {
        const current = deps.members.findById(tx, input.id)
        if (!current) throw notFound(input.id)
        const row = prepare(tx, input, current)
        deps.members.update(tx, input.id, { ...row, updatedAt: deps.clock().toISOString() })
        const updated = deps.members.findById(tx, input.id)
        if (!updated) throw notFound(input.id)
        return updated
      })
      index = null
      deps.logger.info({ id: member.id }, 'fidèle modifié')
      return member
    },

    delete(id: number): void {
      const deleted = deps.members.softDelete(deps.db, id, deps.clock().toISOString())
      if (!deleted) throw notFound(id)
      index = null
      deps.logger.info({ id }, 'fidèle supprimé')
    }
  }
}

export type MembersService = ReturnType<typeof createMembersService>
