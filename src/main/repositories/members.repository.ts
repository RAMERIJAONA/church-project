import { and, asc, count, eq, inArray, isNull, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { DbOrTx } from '@main/db/client'
import { households, members, sectors } from '@main/db/schema'
import type { MemberRole, Sex } from '@shared/domain/members/households.rules'
import type { SearchEntry } from '@shared/domain/members/members.search'
import type { MemberDTO } from '@shared/domain/members/members.types'
import { toDTO, toSearchEntry } from './members.rows'

/** Fidèle tel qu'il est écrit : champs déjà normalisés par le service. */
export interface MemberWriteRow {
  householdId: number
  role: MemberRole
  rank: number
  sex: Sex
  lastName: string
  firstName: string
  birthDate: string
  address: string
  phone: string | null
  baptized: boolean
  communicant: boolean
  deacon: boolean
}

const sponsor = alias(members, 'sponsor')
const sponsorHousehold = alias(households, 'sponsor_household')
const sponsorSector = alias(sectors, 'sponsor_sector')

const readCols = {
  id: members.id,
  householdId: members.householdId,
  householdNumber: households.number,
  role: members.role,
  rank: members.rank,
  sex: members.sex,
  lastName: members.lastName,
  firstName: members.firstName,
  birthDate: members.birthDate,
  address: members.address,
  phone: members.phone,
  baptized: members.baptized,
  communicant: members.communicant,
  deacon: members.deacon,
  createdAt: members.createdAt,
  updatedAt: members.updatedAt,
  sectorId: sectors.id,
  sectorNumber: sectors.number,
  sectorName: sectors.name,
  sponsorId: sponsor.id,
  sponsorLastName: sponsor.lastName,
  sponsorFirstName: sponsor.firstName,
  sponsorRank: sponsor.rank,
  sponsorBaptized: sponsor.baptized,
  sponsorCommunicant: sponsor.communicant,
  sponsorHouseholdNumber: sponsorHousehold.number,
  sponsorSectorNumber: sponsorSector.number
}

const active = isNull(members.deletedAt)

/** Fidèles avec leur foyer, son secteur et son parrain (actif). */
function readQuery(db: DbOrTx) {
  return db
    .select(readCols)
    .from(members)
    .innerJoin(households, eq(households.id, members.householdId))
    .innerJoin(sectors, eq(sectors.id, households.sectorId))
    .leftJoin(sponsor, and(eq(sponsor.id, households.sponsorId), isNull(sponsor.deletedAt)))
    .leftJoin(sponsorHousehold, eq(sponsorHousehold.id, sponsor.householdId))
    .leftJoin(sponsorSector, eq(sponsorSector.id, sponsorHousehold.sectorId))
}

const except = (exceptId?: number) =>
  exceptId === undefined ? undefined : ne(members.id, exceptId)

/** Accès données des fidèles. Toutes les lectures excluent les fidèles supprimés. */
export function createMembersRepository() {
  return {
    insert(db: DbOrTx, row: MemberWriteRow & { createdAt: string }): number {
      return db
        .insert(members)
        .values({ ...row, updatedAt: row.createdAt })
        .returning({ id: members.id })
        .get().id
    },

    update(db: DbOrTx, id: number, row: Partial<MemberWriteRow> & { updatedAt: string }): void {
      db.update(members)
        .set(row)
        .where(and(eq(members.id, id), active))
        .run()
    },

    /** `false` si le fidèle n'existe pas ou est déjà supprimé. */
    softDelete(db: DbOrTx, id: number, at: string): boolean {
      const res = db
        .update(members)
        .set({ deletedAt: at, updatedAt: at })
        .where(and(eq(members.id, id), active))
        .run()
      return res.changes > 0
    },

    findById(db: DbOrTx, id: number): MemberDTO | null {
      const row = readQuery(db)
        .where(and(eq(members.id, id), active))
        .get()
      return row ? toDTO(row) : null
    },

    /** Ordre non garanti : l'appelant réordonne. */
    findByIds(db: DbOrTx, ids: readonly number[]): MemberDTO[] {
      if (ids.length === 0) return []
      return readQuery(db)
        .where(and(inArray(members.id, [...ids]), active))
        .all()
        .map(toDTO)
    },

    /** Page de la liste, triée par nom puis prénom (index `members_name_unique_idx`). */
    listPage(db: DbOrTx, offset: number, limit: number): MemberDTO[] {
      return readQuery(db)
        .where(active)
        .orderBy(asc(members.lastName), asc(members.firstName), asc(members.id))
        .limit(limit)
        .offset(offset)
        .all()
        .map(toDTO)
    },

    count(db: DbOrTx): number {
      return db.select({ n: count() }).from(members).where(active).get()?.n ?? 0
    },

    /** Lignes de l'index en mémoire (recherche, filtres et tri de la liste globale). */
    searchEntries(db: DbOrTx): SearchEntry[] {
      return readQuery(db)
        .where(active)
        .all()
        .map((r) => toSearchEntry(toDTO(r)))
    },

    /** Fidèle actif de même nom et prénom (normalisés) : unique, index `members_name_unique_idx`. */
    findByName(
      db: DbOrTx,
      key: Pick<MemberDTO, 'lastName' | 'firstName'>,
      exceptId?: number
    ): MemberDTO | null {
      const row = readQuery(db)
        .where(
          and(
            eq(members.lastName, key.lastName),
            eq(members.firstName, key.firstName),
            active,
            except(exceptId)
          )
        )
        .get()
      return row ? toDTO(row) : null
    },

    /** Membre actif à ce rang du foyer (index `members_rank_unique_idx`). */
    findByRank(db: DbOrTx, householdId: number, rank: number, exceptId?: number): MemberDTO | null {
      const row = readQuery(db)
        .where(
          and(
            eq(members.householdId, householdId),
            eq(members.rank, rank),
            active,
            except(exceptId)
          )
        )
        .get()
      return row ? toDTO(row) : null
    },

    /** Membres actifs du foyer, par rang (index `members_rank_unique_idx`). */
    listByHousehold(db: DbOrTx, householdId: number): MemberDTO[] {
      return readQuery(db)
        .where(and(eq(members.householdId, householdId), active))
        .orderBy(asc(members.rank))
        .all()
        .map(toDTO)
    },

    /** Diacres actifs, par nom (choix du parrain d'un foyer). */
    deacons(db: DbOrTx, limit: number): MemberDTO[] {
      return readQuery(db)
        .where(and(eq(members.deacon, true), active))
        .orderBy(asc(members.lastName), asc(members.firstName))
        .limit(limit)
        .all()
        .map(toDTO)
    },

    /** Enfants actifs du foyer, par rang croissant. */
    childrenOf(db: DbOrTx, householdId: number): Array<{ id: number; rank: number }> {
      return db
        .select({ id: members.id, rank: members.rank })
        .from(members)
        .where(and(eq(members.householdId, householdId), eq(members.role, 'child'), active))
        .orderBy(asc(members.rank))
        .all()
    }
  }
}

export type MembersRepository = ReturnType<typeof createMembersRepository>
