import { z } from 'zod'
import {
  MEMBER_ROLES,
  roleError,
  SEXES,
  type MemberRole,
  type Sex
} from '@shared/domain/members/households.rules'
import {
  birthDateError,
  formatPhone,
  parsePhone,
  PHONE_ERROR
} from '@shared/domain/members/members.rules'
import type { HouseholdDTO } from '@shared/domain/members/households.types'
import type { MemberDTO } from '@shared/domain/members/members.types'

const memberFormBaseSchema = z.object({
  /** '' : pas encore choisi (premier membre d'un foyer vide) */
  role: z.enum(['', ...MEMBER_ROLES]),
  sex: z.enum(['', ...SEXES]),
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.').max(80),
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.').max(80),
  birthDate: z.string().min(1, 'La date de naissance est obligatoire.'),
  address: z.string().trim().min(1, 'L’adresse est obligatoire.').max(200),
  phone: z.string().trim().max(30),
  baptized: z.boolean(),
  communicant: z.boolean(),
  deacon: z.boolean()
})

export type MemberFormValues = z.output<typeof memberFormBaseSchema>

/** Fiche validée : rôle et sexe choisis. */
export type MemberFormSubmit = Omit<MemberFormValues, 'role' | 'sex'> & {
  role: MemberRole
  sex: Sex
}

const isRole = (v: string): v is MemberRole => (MEMBER_ROLES as readonly string[]).includes(v)
const isSex = (v: string): v is Sex => (SEXES as readonly string[]).includes(v)

/** Rôle et sexe choisis (garantis par le schéma) ; `null` sinon. */
export function toSubmit(values: MemberFormValues): MemberFormSubmit | null {
  const { role, sex } = values
  return isRole(role) && isSex(sex) ? { ...values, role, sex } : null
}

/**
 * Formulaire d'un fidèle : mêmes règles que le service (shared/domain/members), pour afficher
 * les erreurs sous les champs avant l'envoi. Le service reste la vérité.
 */
export function makeMemberFormSchema(today: string): typeof memberFormBaseSchema {
  return memberFormBaseSchema.superRefine((v, ctx) => {
    if (v.role === '')
      ctx.addIssue({ code: 'custom', path: ['role'], message: 'Choisissez un rôle.' })
    if (v.sex === '')
      ctx.addIssue({ code: 'custom', path: ['sex'], message: 'Choisissez le sexe.' })
    if (isRole(v.role) && isSex(v.sex)) {
      const error = roleError(v.role, v.sex, new Set())
      if (error) ctx.addIssue({ code: 'custom', path: ['sex'], message: error })
    }
    const dateError = v.birthDate === '' ? null : birthDateError(v.birthDate, today)
    if (dateError) ctx.addIssue({ code: 'custom', path: ['birthDate'], message: dateError })
    if (!parsePhone(v.phone).ok) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: PHONE_ERROR })
    }
  })
}

/**
 * Valeurs initiales. Ajout : adresse du membre de plus petit rang du foyer (choix de l'équipe,
 * spec 8.5), rôle à choisir pour le premier membre, « Enfant » ensuite.
 */
export function memberFormDefaults(m: MemberDTO | null, household: HouseholdDTO): MemberFormValues {
  if (m) {
    return {
      role: m.role,
      sex: m.sex,
      lastName: m.lastName,
      firstName: m.firstName,
      birthDate: m.birthDate,
      address: m.address,
      phone: m.phone ? formatPhone(m.phone) : '',
      baptized: m.baptized,
      communicant: m.communicant,
      deacon: m.deacon
    }
  }
  return {
    role: household.members.length === 0 ? '' : 'child',
    sex: '',
    lastName: '',
    firstName: '',
    birthDate: '',
    address: household.members[0]?.address ?? '',
    phone: '',
    baptized: false,
    communicant: false,
    deacon: false
  }
}
