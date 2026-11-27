import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@renderer/components/ui/native-select'
import {
  MEMBER_ROLES,
  ROLE_LABELS,
  sexForRole,
  type MemberRole
} from '@shared/domain/members/households.rules'
import type { HouseholdSummaryDTO } from '@shared/domain/members/households.types'
import { memberDisplayName } from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'
import { FormField } from './FormField'
import { missingText } from './members.styles'

export interface MoveMemberDialogProps {
  member: MemberDTO | null
  /** Foyer trouvé pour le numéro saisi ; `null` : aucun ; `undefined` : rien saisi ou en cours */
  target: HouseholdSummaryDTO | null | undefined
  onNumberChange: (number: number | null) => void
  submitting: boolean
  serverError: string | null
  onSubmit: (householdId: number, role: MemberRole) => void
  onCancel: () => void
}

/** Déplacer un fidèle dans un autre foyer ; les rangs de son foyer d'origine ne bougent pas. */
export function MoveMemberDialog(props: MoveMemberDialogProps): React.JSX.Element {
  return (
    <Dialog open={props.member !== null} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent>{props.member && <MoveForm {...props} member={props.member} />}</DialogContent>
    </Dialog>
  )
}

function MoveForm({
  member,
  target,
  onNumberChange,
  submitting,
  serverError,
  onSubmit,
  onCancel
}: MoveMemberDialogProps & { member: MemberDTO }): React.JSX.Element {
  const [number, setNumber] = useState('')
  const [role, setRole] = useState<MemberRole>(member.role)
  const sameHousehold = target?.id === member.householdId
  const ready = target && !sameHousehold
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) onSubmit(target.id, role)
      }}
    >
      <DialogHeader>
        <DialogTitle>Déplacer {memberDisplayName(member)}</DialogTitle>
        <DialogDescription>
          Son matricule suivra son nouveau foyer. Les rangs des membres du foyer{' '}
          {member.householdNumber} ne changent pas.
        </DialogDescription>
      </DialogHeader>
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      <FormField
        id="move-number"
        label="Numéro du foyer d’arrivée"
        required
        error={sameHousehold ? 'Ce fidèle est déjà dans ce foyer.' : undefined}
      >
        <Input
          id="move-number"
          inputMode="numeric"
          autoFocus
          value={number}
          onChange={(e) => {
            const digits = e.currentTarget.value.replace(/\D/g, '')
            setNumber(digits)
            onNumberChange(digits === '' ? null : Number(digits))
          }}
        />
      </FormField>
      {number !== '' && target === null && (
        <p className={`text-sm ${missingText}`}>Aucun foyer {number}.</p>
      )}
      {target && !sameHousehold && (
        <p className="text-sm">
          Foyer {target.number} · {target.mainName ?? 'Aucun membre'} · {target.sector.numeral}{' '}
          {target.sector.name}
        </p>
      )}
      <FormField id="move-role" label="Rôle dans ce foyer" required>
        <NativeSelect
          id="move-role"
          className="w-full"
          value={role}
          onChange={(e) => {
            const v = e.currentTarget.value
            setRole(MEMBER_ROLES.find((r) => r === v) ?? 'child')
          }}
        >
          {MEMBER_ROLES.map((r) => {
            // Père masculin, mère féminine : rôle impossible pour ce fidèle grisé
            const imposed = sexForRole(r)
            const impossible = imposed !== null && imposed !== member.sex
            const suffix = imposed === 'M' ? ' (sexe masculin)' : ' (sexe féminin)'
            return (
              <NativeSelectOption key={r} value={r} disabled={impossible}>
                {impossible ? `${ROLE_LABELS[r]}${suffix}` : ROLE_LABELS[r]}
              </NativeSelectOption>
            )
          })}
        </NativeSelect>
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting || !ready}>
          Déplacer
        </Button>
      </DialogFooter>
    </form>
  )
}
