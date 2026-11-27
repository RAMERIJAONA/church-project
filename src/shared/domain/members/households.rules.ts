/**
 * Rôles et rangs des membres d'un foyer (porteur, 2026-11-27). Le rang suit le rôle : Père ou
 * Chef de foyer = 1, Mère = 2, Enfants = 3, 4, 5… Un rang d'enfant n'est jamais réutilisé.
 */

export const MEMBER_ROLES = ['head', 'father', 'mother', 'child'] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export const ROLE_LABELS: Record<MemberRole, string> = {
  head: 'Chef de foyer',
  father: 'Père',
  mother: 'Mère',
  child: 'Enfant'
}

export const SEXES = ['M', 'F'] as const
export type Sex = (typeof SEXES)[number]

export const SEX_LABELS: Record<Sex, string> = { M: 'Masculin', F: 'Féminin' }

/** Rang du père et du chef de foyer */
export const HEAD_RANK = 1
export const MOTHER_RANK = 2

/** Sexe imposé par le rôle (porteur, 2026-11-27) : père masculin, mère féminine ; sinon au choix. */
export function sexForRole(role: MemberRole): Sex | null {
  if (role === 'father') return 'M'
  if (role === 'mother') return 'F'
  return null
}

/** Rang d'un rôle ; un enfant prend le rang qui suit le plus haut jamais attribué au foyer. */
export function rankForRole(role: MemberRole, lastChildRank: number): number {
  if (role === 'mother') return MOTHER_RANK
  if (role === 'child') return lastChildRank + 1
  return HEAD_RANK
}

/** Erreur d'un rôle dans un foyer dont `takenRanks` sont occupés (sans le membre lui-même). */
export function roleError(
  role: MemberRole,
  sex: Sex,
  takenRanks: ReadonlySet<number>
): string | null {
  if (role === 'father' && sex !== 'M') return 'Le père est de sexe masculin.'
  if (role === 'mother' && sex !== 'F') return 'La mère est de sexe féminin.'
  if ((role === 'father' || role === 'head') && takenRanks.has(HEAD_RANK)) {
    return 'Ce foyer a déjà un rang 1 (Père ou Chef de foyer).'
  }
  if (role === 'mother' && takenRanks.has(MOTHER_RANK)) return 'Ce foyer a déjà une mère.'
  return null
}
