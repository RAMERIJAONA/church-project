/**
 * Contrôles d'écriture d'un fidèle, partagés par les cas d'usage de `members.service.ts` :
 * mise en forme de la fiche, statuts, unicité du nom, rang selon le rôle (porteur, 2026-11-27).
 */
import type { Clock } from '@main/adapters/clock.adapter'
import type { Tx } from '@main/db/client'
import type { HouseholdRow, HouseholdsRepository } from '@main/repositories/households.repository'
import type { MembersRepository, MemberWriteRow } from '@main/repositories/members.repository'
import { AppError } from '@shared/domain/errors'
import {
  rankForRole,
  roleError,
  type MemberRole,
  type Sex
} from '@shared/domain/members/households.rules'
import {
  applyStatusRules,
  birthDateError,
  formatBirthDate,
  memberDisplayName,
  normalizeFirstName,
  normalizeLastName,
  parsePhone,
  PHONE_ERROR
} from '@shared/domain/members/members.rules'
import type {
  CreateMemberParsed,
  MemberConflictDetails,
  UpdateMemberParsed
} from '@shared/domain/members/members.types'
import { localDateOf } from '@shared/utils/dates'

export type MemberFields = Omit<MemberWriteRow, 'householdId' | 'role' | 'rank'>

function conflict(message: string, details: MemberConflictDetails): AppError {
  return new AppError('CONFLICT', message, details)
}

/** Normalise et contrôle les champs d'une fiche ; lève l'erreur à afficher. */
export function prepareMemberFields(
  tx: Tx,
  deps: { members: MembersRepository; clock: Clock },
  input: CreateMemberParsed | UpdateMemberParsed,
  /** Fidèle modifié, exclu du contrôle d'unicité (absent : ajout) */
  exceptId?: number
): MemberFields {
  const lastName = normalizeLastName(input.lastName)
  const firstName = normalizeFirstName(input.firstName)

  const dateError = birthDateError(input.birthDate, localDateOf(deps.clock()))
  if (dateError) throw new AppError('VALIDATION', dateError, { field: 'birthDate' })

  const phone = parsePhone(input.phone ?? '')
  if (!phone.ok) throw new AppError('VALIDATION', PHONE_ERROR, { field: 'phone' })

  // Deux fidèles actifs ne portent jamais le même nom et prénom (porteur, 2026-11-27)
  const homonym = deps.members.findByName(tx, { lastName, firstName }, exceptId)
  if (homonym) {
    throw conflict(
      `Un fidèle ${memberDisplayName(homonym)} existe déjà (né le ${formatBirthDate(homonym.birthDate)}, matricule ${homonym.matricule}).`,
      { reason: 'name-taken', existing: homonym }
    )
  }

  return {
    sex: input.sex,
    lastName,
    firstName,
    birthDate: input.birthDate,
    address: input.address,
    phone: phone.value,
    // Diacre ⇒ communiant ⇒ baptisé : l'entrée est complétée, jamais refusée
    ...applyStatusRules(input)
  }
}

/** Père masculin, mère féminine. */
export function assertSexFitsRole(role: MemberRole, sex: Sex): void {
  const error = roleError(role, sex, new Set())
  if (error) throw new AppError('BUSINESS_RULE', error, { field: 'sex' })
}

/**
 * Rang d'un rôle dans un foyer. Rang 1 ou 2 déjà pris → `CONFLICT` ; un enfant prend le rang
 * qui suit le plus haut jamais attribué, noté sur le foyer.
 */
export function rankInHousehold(
  tx: Tx,
  deps: { members: MembersRepository; households: HouseholdsRepository },
  p: { household: HouseholdRow; role: MemberRole; sex: Sex; memberId?: number; at: string }
): number {
  assertSexFitsRole(p.role, p.sex)
  const rank = rankForRole(p.role, p.household.lastChildRank)
  if (p.role === 'child') {
    deps.households.setLastChildRank(tx, p.household.id, rank, p.at)
    return rank
  }
  const holder = deps.members.findByRank(tx, p.household.id, rank, p.memberId)
  if (holder) {
    const message = (roleError(p.role, p.sex, new Set([rank])) ?? '').replace(/\.$/, '')
    throw conflict(`${message} : ${memberDisplayName(holder)}.`, {
      reason: 'rank-taken',
      existing: holder
    })
  }
  return rank
}
