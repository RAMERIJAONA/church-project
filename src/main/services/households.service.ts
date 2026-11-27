import type { Clock } from '@main/adapters/clock.adapter'
import type { Db, DbOrTx } from '@main/db/client'
import type { Logger } from '@main/logging/logger'
import type {
  HouseholdFilters,
  HouseholdSummaryRow,
  HouseholdsRepository
} from '@main/repositories/households.repository'
import type { MembersRepository } from '@main/repositories/members.repository'
import type { SectorsRepository } from '@main/repositories/sectors.repository'
import { AppError } from '@shared/domain/errors'
import type {
  CreateHouseholdParsed,
  HouseholdDTO,
  HouseholdSummaryDTO,
  ListHouseholdsParsed,
  SponsorDTO,
  UpdateHouseholdParsed
} from '@shared/domain/members/households.types'
import { nextNumber } from '@shared/domain/members/sectors.rules'
import type { MemberDTO, Paginated } from '@shared/domain/members/members.types'
import { isBlankQuery, type SearchEntry } from '@shared/domain/members/members.search'
import { toRoman } from '@shared/utils/roman'

const SPONSOR_CANDIDATES_LIMIT = 50

const sponsorOf = (m: MemberDTO): SponsorDTO => ({
  id: m.id,
  lastName: m.lastName,
  firstName: m.firstName,
  matricule: m.matricule
})

/**
 * Foyers (porteur, 2026-11-27) : numéro jamais réattribué, secteur choisi parmi les secteurs,
 * parrain diacre ou « à désigner ». `memberSearch` et `onChange` viennent du service des
 * fidèles (recherche par nom d'un membre ; index à reconstruire quand un matricule change).
 */
export function createHouseholdsService(deps: {
  db: Db
  households: HouseholdsRepository
  members: MembersRepository
  sectors: SectorsRepository
  clock: Clock
  logger: Logger
  memberSearch: (query: string) => SearchEntry[]
  onChange: () => void
}) {
  const notFound = (id: number): AppError => new AppError('NOT_FOUND', 'Foyer introuvable.', { id })

  function assertSector(db: DbOrTx, sectorId: number): void {
    if (!deps.sectors.findById(db, sectorId)) {
      throw new AppError('NOT_FOUND', 'Secteur introuvable.', { sectorId })
    }
  }

  function assertSponsor(db: DbOrTx, sponsorId: number | null): void {
    if (sponsorId === null) return
    if (!deps.members.findById(db, sponsorId)?.deacon) {
      throw new AppError('BUSINESS_RULE', 'Le parrain doit être un diacre.', { field: 'sponsorId' })
    }
  }

  /** Lignes → DTO, parrains lus en une requête. */
  function summaries(db: DbOrTx, rows: HouseholdSummaryRow[]): HouseholdSummaryDTO[] {
    const ids = rows.flatMap((r) => (r.sponsorId === null ? [] : [r.sponsorId]))
    const sponsors = new Map(deps.members.findByIds(db, ids).map((m) => [m.id, sponsorOf(m)]))
    return rows.map((r) => ({
      id: r.id,
      number: r.number,
      sector: {
        id: r.sectorId,
        number: r.sectorNumber,
        name: r.sectorName,
        numeral: toRoman(r.sectorNumber)
      },
      sponsor: r.sponsorId === null ? null : (sponsors.get(r.sponsorId) ?? null),
      memberCount: r.memberCount,
      mainLastName: r.mainLastName
    }))
  }

  function get(db: DbOrTx, id: number): HouseholdDTO {
    const row = deps.households.findSummary(db, id)
    if (!row) throw notFound(id)
    const [summary] = summaries(db, [row])
    if (!summary) throw notFound(id)
    const members = deps.members.listByHousehold(db, id)
    return {
      ...summary,
      members,
      takenRanks: members.map((m) => m.rank),
      lastChildRank: row.lastChildRank
    }
  }

  /** Recherche : numéro exact, sinon nom d'un membre (index de recherche des fidèles). */
  function filtersOf(input: ListHouseholdsParsed): HouseholdFilters {
    const base = { sectorId: input.sectorId, sponsorMissing: input.sponsorMissing }
    const search = input.search.trim()
    if (/^\d+$/.test(search)) return { ...base, number: Number(search) }
    if (isBlankQuery(search)) return base
    return { ...base, ids: [...new Set(deps.memberSearch(search).map((m) => m.householdId))] }
  }

  return {
    list(input: ListHouseholdsParsed): Paginated<HouseholdSummaryDTO> {
      const filters = filtersOf(input)
      const offset = (input.page - 1) * input.pageSize
      const rows = deps.households.listPage(deps.db, filters, offset, input.pageSize)
      return {
        items: summaries(deps.db, rows),
        total: deps.households.count(deps.db, filters),
        page: input.page,
        pageSize: input.pageSize
      }
    },

    get(id: number): HouseholdDTO {
      return get(deps.db, id)
    },

    create(input: CreateHouseholdParsed): HouseholdDTO {
      const household = deps.db.transaction((tx) => {
        assertSector(tx, input.sectorId)
        assertSponsor(tx, input.sponsorId)
        const id = deps.households.insert(tx, {
          number: nextNumber(deps.households.maxNumber(tx)),
          sectorId: input.sectorId,
          sponsorId: input.sponsorId,
          createdAt: deps.clock().toISOString()
        })
        return get(tx, id)
      })
      deps.logger.info({ id: household.id, number: household.number }, 'foyer créé')
      return household
    },

    /** Secteur ou parrain : les matricules des membres suivent le secteur. */
    update(input: UpdateHouseholdParsed): HouseholdDTO {
      const household = deps.db.transaction((tx) => {
        if (!deps.households.findById(tx, input.id)) throw notFound(input.id)
        assertSector(tx, input.sectorId)
        assertSponsor(tx, input.sponsorId)
        deps.households.update(tx, input.id, { ...input, at: deps.clock().toISOString() })
        return get(tx, input.id)
      })
      deps.onChange()
      deps.logger.info({ id: household.id }, 'foyer modifié')
      return household
    },

    /** Seulement un foyer vide ; son numéro n'est jamais réattribué. */
    delete(id: number): void {
      deps.db.transaction((tx) => {
        if (get(tx, id).memberCount > 0) {
          throw new AppError('BUSINESS_RULE', 'Retirez d’abord les membres de ce foyer.')
        }
        deps.households.softDelete(tx, id, deps.clock().toISOString())
      })
      deps.logger.info({ id }, 'foyer supprimé')
    },

    /** Diacres actifs, par nom ou par pertinence de la recherche. */
    sponsorCandidates(search: string): SponsorDTO[] {
      if (isBlankQuery(search)) {
        return deps.members.deacons(deps.db, SPONSOR_CANDIDATES_LIMIT).map(sponsorOf)
      }
      // Diacres choisis dans l'index en mémoire : seuls ceux affichés sont lus en base
      const ids = deps
        .memberSearch(search)
        .filter((m) => m.deacon)
        .slice(0, SPONSOR_CANDIDATES_LIMIT)
        .map((m) => m.id)
      const byId = new Map(deps.members.findByIds(deps.db, ids).map((m) => [m.id, m]))
      return ids.flatMap((id) => {
        const m = byId.get(id)
        return m ? [sponsorOf(m)] : []
      })
    }
  }
}

export type HouseholdsService = ReturnType<typeof createHouseholdsService>
