import type { Clock } from '@main/adapters/clock.adapter'
import type { Db, DbOrTx } from '@main/db/client'
import type { Logger } from '@main/logging/logger'
import type { SectorRow, SectorsRepository } from '@main/repositories/sectors.repository'
import { AppError } from '@shared/domain/errors'
import { nextNumber, normalizeSectorName } from '@shared/domain/members/sectors.rules'
import type {
  CreateSectorParsed,
  RenameSectorParsed,
  SectorDTO
} from '@shared/domain/members/sectors.types'
import { toRoman } from '@shared/utils/roman'

export function toSectorDTO(row: SectorRow): SectorDTO {
  return { ...row, numeral: toRoman(row.number) }
}

/**
 * Secteurs (porteur, 2026-11-27) : numéro romain dans l'ordre de création, stable quand on
 * renomme, jamais réattribué ; nom unique, mis en forme.
 */
export function createSectorsService(deps: {
  db: Db
  sectors: SectorsRepository
  clock: Clock
  logger: Logger
}) {
  function assertNameFree(db: DbOrTx, name: string, exceptId?: number): void {
    const owner = deps.sectors.findByName(db, name, exceptId)
    if (owner) {
      throw new AppError(
        'CONFLICT',
        `Le secteur ${owner.name} existe déjà (n° ${toRoman(owner.number)}).`,
        { field: 'name' }
      )
    }
  }

  function get(db: DbOrTx, id: number): SectorDTO {
    const row = deps.sectors.findById(db, id)
    if (!row) throw new AppError('NOT_FOUND', 'Secteur introuvable.', { id })
    return toSectorDTO(row)
  }

  return {
    list(): SectorDTO[] {
      return deps.sectors.list(deps.db).map(toSectorDTO)
    },

    create(input: CreateSectorParsed): SectorDTO {
      const sector = deps.db.transaction((tx) => {
        const name = normalizeSectorName(input.name)
        assertNameFree(tx, name)
        const number = nextNumber(deps.sectors.maxNumber(tx))
        const id = deps.sectors.insert(tx, { number, name, createdAt: deps.clock().toISOString() })
        return get(tx, id)
      })
      deps.logger.info({ id: sector.id, number: sector.number }, 'secteur créé')
      return sector
    },

    rename(input: RenameSectorParsed): SectorDTO {
      const sector = deps.db.transaction((tx) => {
        get(tx, input.id)
        const name = normalizeSectorName(input.name)
        assertNameFree(tx, name, input.id)
        deps.sectors.rename(tx, input.id, name, deps.clock().toISOString())
        return get(tx, input.id)
      })
      deps.logger.info({ id: sector.id }, 'secteur renommé')
      return sector
    }
  }
}

export type SectorsService = ReturnType<typeof createSectorsService>
