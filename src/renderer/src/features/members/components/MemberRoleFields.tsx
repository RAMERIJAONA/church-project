import { SegmentedControl } from '@renderer/components/common/SegmentedControl'
import { NativeSelect, NativeSelectOption } from '@renderer/components/ui/native-select'
import {
  HEAD_RANK,
  MEMBER_ROLES,
  MOTHER_RANK,
  ROLE_LABELS,
  SEX_LABELS,
  type MemberRole,
  type Sex
} from '@shared/domain/members/households.rules'
import { memberDisplayName } from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'
import { FormField } from './FormField'

export interface MemberRoleFieldsProps {
  role: MemberRole | ''
  sex: Sex | ''
  /** Membres actifs du foyer, sans le fidèle modifié (rôles déjà pris) */
  others: MemberDTO[]
  roleError?: string
  sexError?: string
  /** Sous le rôle : « Son matricule deviendra 1/1-I. » */
  roleHint?: string
  onRoleChange: (role: MemberRole | '') => void
  onSexChange: (sex: Sex) => void
}

const SEX_OPTIONS = [
  { value: 'M', label: SEX_LABELS.M },
  { value: 'F', label: SEX_LABELS.F }
] as const

const rankOf = (role: MemberRole): number | null =>
  role === 'mother' ? MOTHER_RANK : role === 'child' ? null : HEAD_RANK

/** Rôle dans le foyer (rang du matricule) et sexe ; un rôle déjà pris est grisé avec la raison. */
export function MemberRoleFields(p: MemberRoleFieldsProps): React.JSX.Element {
  const holderOf = (role: MemberRole): MemberDTO | undefined => {
    const rank = rankOf(role)
    return rank === null ? undefined : p.others.find((m) => m.rank === rank)
  }
  return (
    <>
      <FormField id="member-role" label="Rôle" required error={p.roleError} hint={p.roleHint}>
        <NativeSelect
          id="member-role"
          className="w-full"
          value={p.role}
          aria-invalid={p.roleError ? true : undefined}
          onChange={(e) => {
            const v = e.currentTarget.value
            p.onRoleChange(MEMBER_ROLES.find((r) => r === v) ?? '')
          }}
        >
          <NativeSelectOption value="">Choisir un rôle…</NativeSelectOption>
          {MEMBER_ROLES.map((role) => {
            const holder = holderOf(role)
            return (
              <NativeSelectOption key={role} value={role} disabled={holder !== undefined}>
                {holder
                  ? `${ROLE_LABELS[role]} (déjà ${memberDisplayName(holder)})`
                  : ROLE_LABELS[role]}
              </NativeSelectOption>
            )
          })}
        </NativeSelect>
      </FormField>
      <FormField id="member-sex" label="Sexe" required error={p.sexError}>
        <SegmentedControl<Sex | ''>
          label="Sexe"
          value={p.sex}
          options={SEX_OPTIONS}
          onValueChange={(v) => v !== '' && p.onSexChange(v)}
        />
      </FormField>
    </>
  )
}
