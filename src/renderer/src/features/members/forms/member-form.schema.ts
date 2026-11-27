import { z } from 'zod'
import {
  birthDateError,
  communicantError,
  formatPhone,
  parsePhone,
  PHONE_ERROR
} from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'

const memberFormBaseSchema = z.object({
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.').max(80),
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.').max(80),
  birthDate: z.string().min(1, 'La date de naissance est obligatoire.'),
  address: z.string().trim().min(1, 'L’adresse est obligatoire.').max(200),
  phone: z.string().trim().max(30),
  baptized: z.boolean(),
  communicant: z.boolean()
})

export type MemberFormValues = z.output<typeof memberFormBaseSchema>

/**
 * Formulaire d'un fidèle : mêmes règles que le service (shared/domain/members), pour afficher
 * les erreurs sous les champs avant l'envoi. Le service reste la vérité.
 */
export function makeMemberFormSchema(today: string): typeof memberFormBaseSchema {
  return memberFormBaseSchema.superRefine((v, ctx) => {
    const dateError = v.birthDate === '' ? null : birthDateError(v.birthDate, today)
    if (dateError) ctx.addIssue({ code: 'custom', path: ['birthDate'], message: dateError })
    if (!parsePhone(v.phone).ok) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: PHONE_ERROR })
    }
    const ruleError = communicantError(v.baptized, v.communicant)
    if (ruleError) ctx.addIssue({ code: 'custom', path: ['communicant'], message: ruleError })
  })
}

/** Valeurs initiales : vides pour un ajout, celles du fidèle pour une modification. */
export function memberFormDefaults(m: MemberDTO | null): MemberFormValues {
  return {
    lastName: m?.lastName ?? '',
    firstName: m?.firstName ?? '',
    birthDate: m?.birthDate ?? '',
    address: m?.address ?? '',
    phone: m?.phone ? formatPhone(m.phone) : '',
    baptized: m?.baptized ?? false,
    communicant: m?.communicant ?? false
  }
}
