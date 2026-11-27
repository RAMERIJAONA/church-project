import { rankForRole } from '@shared/domain/members/households.rules'
import type { HouseholdDTO } from '@shared/domain/members/households.types'
import {
  ageOn,
  applyStatusRules,
  birthDateError,
  formatAge,
  matricule,
  type Statuses
} from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'
import type { MemberFormValues } from './member-form.schema'

export interface MemberPreview {
  statuses: Statuses
  /** Matricule avec la saisie en cours ; `null` tant que le rôle n'est pas choisi */
  matricule: string | null
  /** « 41 ans » ; `null` sans date de naissance valide */
  age: string | null
}

/**
 * Ce que la fiche affiche en lecture seule pendant la saisie, avec les mêmes règles que le
 * service : statuts complétés, rang inchangé tant que le rôle ne change pas.
 */
export function memberPreview(
  values: Partial<MemberFormValues>,
  initial: MemberDTO | null,
  household: HouseholdDTO,
  today: string
): MemberPreview {
  const statuses = applyStatusRules({
    baptized: values.baptized ?? false,
    communicant: values.communicant ?? false,
    deacon: values.deacon ?? false
  })
  const role = values.role ?? ''
  const rank =
    role === ''
      ? null
      : initial?.role === role
        ? initial.rank
        : rankForRole(role, household.lastChildRank)
  const birthDate = values.birthDate ?? ''
  return {
    statuses,
    matricule:
      rank === null
        ? null
        : matricule({
            householdNumber: household.number,
            rank,
            sectorNumber: household.sector.number,
            ...statuses
          }),
    age:
      birthDate !== '' && !birthDateError(birthDate, today)
        ? formatAge(ageOn(birthDate, today))
        : null
  }
}
