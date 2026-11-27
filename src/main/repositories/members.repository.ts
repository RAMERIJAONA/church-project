import { and, asc, count, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import type { DbOrTx } from '@main/db/client'
import { members } from '@main/db/schema'
import type { SearchEntry } from '@shared/domain/members/members.search'
import type { MemberDTO } from '@shared/domain/members/members.types'

/** Fidèle tel qu'il est écrit : champs déjà normalisés par le service. */
export type MemberRow = Omit<MemberDTO, 'id'>

const cols = {
  id: members.id,
  lastName: members.lastName,
  firstName: members.firstName,
  birthDate: members.birthDate,
  address: members.address,
  phone: members.phone,
  sector: members.sector,
  baptized: members.baptized,
  communicant: members.communicant,
  registrationNumber: members.registrationNumber,
  createdAt: members.createdAt,
  updatedAt: members.updatedAt
}

const active = isNull(members.deletedAt)

/** Accès données des fidèles. Toutes les lectures excluent les fidèles supprimés. */
export function createMembersRepository() {
  return {
    insert(db: DbOrTx, row: MemberRow): MemberDTO {
      return db.insert(members).values(row).returning(cols).get()
    },

    update(db: DbOrTx, id: number, row: Omit<MemberRow, 'createdAt'>): void {
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
      return (
        db
          .select(cols)
          .from(members)
          .where(and(eq(members.id, id), active))
          .get() ?? null
      )
    },

    /** Ordre non garanti : l'appelant réordonne. */
    findByIds(db: DbOrTx, ids: readonly number[]): MemberDTO[] {
      if (ids.length === 0) return []
      return db
        .select(cols)
        .from(members)
        .where(and(inArray(members.id, [...ids]), active))
        .all()
    },

    /** Page de la liste, triée par nom puis prénom (index `members_name_idx`). */
    listPage(db: DbOrTx, offset: number, limit: number): MemberDTO[] {
      return db
        .select(cols)
        .from(members)
        .where(active)
        .orderBy(asc(members.lastName), asc(members.firstName), asc(members.id))
        .limit(limit)
        .offset(offset)
        .all()
    },

    count(db: DbOrTx): number {
      return db.select({ n: count() }).from(members).where(active).get()?.n ?? 0
    },

    /** Lignes de l'index de recherche en mémoire. */
    searchEntries(db: DbOrTx): SearchEntry[] {
      return db
        .select({
          id: members.id,
          lastName: members.lastName,
          firstName: members.firstName,
          registrationNumber: members.registrationNumber
        })
        .from(members)
        .where(active)
        .all()
    },

    /** Insensible à la casse, comme l'index unique `members_registration_number_idx`. */
    findByRegistrationNumber(db: DbOrTx, value: string, exceptId?: number): MemberDTO | null {
      return (
        db
          .select(cols)
          .from(members)
          .where(
            and(
              sql`${members.registrationNumber} = ${value} COLLATE NOCASE`,
              active,
              exceptId === undefined ? undefined : ne(members.id, exceptId)
            )
          )
          .get() ?? null
      )
    },

    /** Fidèles de même nom, prénom (normalisés) et date de naissance. */
    findSameIdentity(
      db: DbOrTx,
      key: Pick<MemberDTO, 'lastName' | 'firstName' | 'birthDate'>,
      exceptId?: number
    ): MemberDTO[] {
      return db
        .select(cols)
        .from(members)
        .where(
          and(
            eq(members.lastName, key.lastName),
            eq(members.firstName, key.firstName),
            eq(members.birthDate, key.birthDate),
            active,
            exceptId === undefined ? undefined : ne(members.id, exceptId)
          )
        )
        .all()
    }
  }
}

export type MembersRepository = ReturnType<typeof createMembersRepository>
