import type { Clock } from '@main/adapters/clock.adapter'
import type { Db, Tx } from '@main/db/client'
import type { Logger } from '@main/logging/logger'
import type { HouseholdRow, HouseholdsRepository } from '@main/repositories/households.repository'
import type { MembersRepository } from '@main/repositories/members.repository'
import { AppError } from '@shared/domain/errors'
import type { MemberRole, Sex } from '@shared/domain/members/households.rules'
import { filterAndSort } from '@shared/domain/members/members.list'
import {
  buildSearchIndex,
  isBlankQuery,
  searchMembers,
  type SearchEntry,
  type SearchIndex
} from '@shared/domain/members/members.search'
import type {
  CreateMemberParsed,
  ListMembersParsed,
  MemberDTO,
  Paginated,
  SwapChildRankParsed,
  UpdateMemberParsed
} from '@shared/domain/members/members.types'
import {
  assertSexFitsRole,
  prepareMemberFields,
  rankInHousehold,
  type MemberFields
} from './members.checks'

/**
 * Fidèles rattachés à un foyer (porteur, 2026-11-27) : normalisation, statuts, rang selon le
 * rôle (jamais réutilisé pour un enfant), parrainage retiré quand un diacre ne l'est plus.
 * L'index de recherche est gardé en mémoire (dérogation du CLAUDE.md par. 6) et reconstruit au
 * besoin après chaque écriture qui change un nom ou un matricule.
 */
/** Liste par nom croissant, sans filtre : servie par SQL. */
const isPlainList = (f: ListMembersParsed): boolean =>
  f.sort === 'name' &&
  f.order === 'asc' &&
  [f.sectorId, f.householdNumber, f.sex, f.baptized, f.communicant, f.deacon].every(
    (v) => v === undefined
  )

export function createMembersService(deps: {
  db: Db
  members: MembersRepository
  households: HouseholdsRepository
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

  const now = (): string => deps.clock().toISOString()
  const prepare = (
    tx: Tx,
    input: CreateMemberParsed | UpdateMemberParsed,
    exceptId?: number
  ): MemberFields => prepareMemberFields(tx, deps, input, exceptId)
  const rankIn = (
    tx: Tx,
    household: HouseholdRow,
    role: MemberRole,
    sex: Sex,
    memberId?: number
  ): number => rankInHousehold(tx, deps, { household, role, sex, memberId, at: now() })

  function notFound(id: number): AppError {
    return new AppError('NOT_FOUND', 'Fidèle introuvable.', { id })
  }

  function householdOf(tx: Tx, id: number): HouseholdRow {
    const household = deps.households.findById(tx, id)
    if (!household) throw new AppError('NOT_FOUND', 'Foyer introuvable.', { householdId: id })
    return household
  }

  function existing(tx: Tx, id: number): MemberDTO {
    const member = deps.members.findById(tx, id)
    if (!member) throw notFound(id)
    return member
  }

  /** Un fidèle qui n'est plus diacre (ou supprimé) ne parraine plus aucun foyer. */
  function dropSponsorships(tx: Tx, memberId: number): void {
    const cleared = deps.households.clearSponsor(tx, memberId, now())
    if (cleared > 0) {
      deps.logger.info({ memberId, households: cleared }, 'foyers repassés « parrain à désigner »')
    }
  }

  function written<T>(fn: (tx: Tx) => T): T {
    const result = deps.db.transaction(fn)
    index = null
    return result
  }

  return {
    get(id: number): MemberDTO {
      const member = deps.members.findById(deps.db, id)
      if (!member) throw notFound(id)
      return member
    },

    list(input: ListMembersParsed): Paginated<MemberDTO> {
      const offset = (input.page - 1) * input.pageSize
      const page = { page: input.page, pageSize: input.pageSize }
      const blank = isBlankQuery(input.search)
      if (blank && isPlainList(input)) {
        // Cas le plus courant : pagination SQL par nom, sans l'index en mémoire
        return {
          ...page,
          items: deps.members.listPage(deps.db, offset, input.pageSize),
          total: deps.members.count(deps.db)
        }
      }
      const { entries } = searchIndex()
      const matched = blank ? null : searchMembers(searchIndex(), input.search)
      const ids = filterAndSort(entries, input, matched)
      const pageIds = ids.slice(offset, offset + input.pageSize)
      const byId = new Map(deps.members.findByIds(deps.db, pageIds).map((m) => [m.id, m]))
      const items = pageIds.flatMap((id) => byId.get(id) ?? [])
      return { ...page, items, total: ids.length }
    },

    /** Ids des fidèles trouvés, par pertinence. */
    searchIds(query: string): number[] {
      return isBlankQuery(query) ? [] : searchMembers(searchIndex(), query)
    },

    /**
     * Fidèles trouvés, par pertinence, tels que l'index les garde (foyer, diacre…) : la liste
     * des foyers et le choix du parrain filtrent sans relire en base tous les fidèles trouvés.
     */
    searchEntries(query: string): SearchEntry[] {
      if (isBlankQuery(query)) return []
      const idx = searchIndex()
      const byId = new Map(idx.entries.map((e) => [e.id, e]))
      return searchMembers(idx, query).flatMap((id) => byId.get(id) ?? [])
    },

    /** L'index est à reconstruire (secteur ou parrain d'un foyer changé). */
    invalidate(): void {
      index = null
    },

    /** Numéros des foyers que ce fidèle parraine (avertissement avant de retirer Diacre). */
    sponsoredHouseholds(id: number): number[] {
      return deps.households.sponsoredNumbers(deps.db, id)
    },

    create(input: CreateMemberParsed): MemberDTO {
      const member = written((tx) => {
        const household = householdOf(tx, input.householdId)
        const fields = prepare(tx, input)
        const rank = rankIn(tx, household, input.role, fields.sex)
        const id = deps.members.insert(tx, {
          ...fields,
          householdId: household.id,
          role: input.role,
          rank,
          createdAt: now()
        })
        return existing(tx, id)
      })
      deps.logger.info({ id: member.id, householdId: member.householdId }, 'fidèle ajouté')
      return member
    },

    update(input: UpdateMemberParsed): MemberDTO {
      const member = written((tx) => {
        const before = existing(tx, input.id)
        const fields = prepare(tx, input, input.id)
        // Le rang ne bouge que si le rôle change (porteur, 2026-11-27 : rangs stables)
        let rank = before.rank
        if (input.role === before.role) assertSexFitsRole(input.role, fields.sex)
        else
          rank = rankIn(tx, householdOf(tx, before.householdId), input.role, fields.sex, input.id)
        deps.members.update(tx, input.id, { ...fields, role: input.role, rank, updatedAt: now() })
        if (before.deacon && !fields.deacon) dropSponsorships(tx, input.id)
        return existing(tx, input.id)
      })
      deps.logger.info({ id: member.id }, 'fidèle modifié')
      return member
    },

    /** Échange le rang d'un enfant avec l'enfant voisin ; sans voisin, rien ne change. */
    swapChildRank(input: SwapChildRankParsed): void {
      written((tx) => {
        const member = existing(tx, input.id)
        if (member.role !== 'child') {
          throw new AppError('BUSINESS_RULE', 'Seuls les enfants peuvent changer de place.')
        }
        const children = deps.members.childrenOf(tx, member.householdId)
        const at = children.findIndex((c) => c.id === member.id)
        const neighbour = children[input.direction === 'up' ? at - 1 : at + 1]
        if (!neighbour) return
        // Rang de passage libre (au-delà du plus haut jamais attribué) : l'index unique est
        // vérifié à chaque instruction, et le CHECK exige un rang d'enfant ≥ 3
        const free = householdOf(tx, member.householdId).lastChildRank + 1
        const updatedAt = now()
        deps.members.update(tx, member.id, { rank: free, updatedAt })
        deps.members.update(tx, neighbour.id, { rank: member.rank, updatedAt })
        deps.members.update(tx, member.id, { rank: neighbour.rank, updatedAt })
      })
      deps.logger.info({ id: input.id, direction: input.direction }, 'rangs échangés')
    },

    delete(id: number): void {
      written((tx) => {
        if (!deps.members.softDelete(tx, id, now())) throw notFound(id)
        dropSponsorships(tx, id)
      })
      deps.logger.info({ id }, 'fidèle supprimé')
    }
  }
}

export type MembersService = ReturnType<typeof createMembersService>
