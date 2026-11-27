import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { DateField } from '@renderer/components/common/DateField'
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
import type { HouseholdDTO } from '@shared/domain/members/households.types'
import {
  memberDisplayName,
  MIN_BIRTH_DATE,
  normalizeFirstName,
  normalizeLastName
} from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'
import {
  makeMemberFormSchema,
  memberFormDefaults,
  toSubmit,
  type MemberFormSubmit,
  type MemberFormValues
} from '../forms/member-form.schema'
import { memberPreview } from '../forms/member-preview'
import { householdNumbersLabel, type MemberServerError } from '../members.utils'
import { FormField } from './FormField'
import { MemberRoleFields } from './MemberRoleFields'
import { MemberSummary } from './MemberSummary'
import { PhoneInput } from './PhoneInput'
import { StatusFields } from './StatusFields'

export interface MemberFormDialogProps {
  open: boolean
  /** `null` : ajout dans `household` */
  initial: MemberDTO | null
  /** Foyer du fidèle (rôles pris, secteur, parrain, matricule) */
  household: HouseholdDTO
  /** « AAAA-MM-JJ » : date de naissance maximale et calcul de l'âge */
  today: string
  /** Foyers que parraine le fidèle modifié (avertissement en retirant Diacre) */
  sponsoredHouseholds: number[]
  submitting: boolean
  serverError: MemberServerError | null
  onSubmit: (values: MemberFormSubmit) => void
  /** Ajout seulement : enregistre puis rouvre une fiche vide */
  onSubmitAndNext?: (values: MemberFormSubmit) => void
  onCancel: () => void
}

/** Fiche d'un fidèle : ajout dans un foyer ou modification (repart de zéro à chaque ouverture). */
export function MemberFormDialog(props: MemberFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      {/* Un clic à côté ne ferme pas : une fiche saisie ne doit pas se perdre (Échap et
          « Annuler » ferment toujours) */}
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {props.open && <MemberForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function MemberForm({
  initial,
  household,
  today,
  sponsoredHouseholds,
  submitting,
  serverError,
  onSubmit,
  onSubmitAndNext,
  onCancel
}: MemberFormDialogProps): React.JSX.Element {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(makeMemberFormSchema(today)),
    defaultValues: memberFormDefaults(initial, household)
  })
  const { errors } = form.formState
  const values = useWatch({ control: form.control })
  const errorOf = (field: keyof MemberFormValues): string | undefined =>
    errors[field]?.message ?? (serverError?.field === field ? serverError.message : undefined)
  const invalid = (field: keyof MemberFormValues): true | undefined =>
    errorOf(field) ? true : undefined
  const describedBy = (field: keyof MemberFormValues): string | undefined =>
    errorOf(field) ? `member-${field}-error` : undefined

  const role = values.role ?? ''
  const { statuses, matricule: preview, age } = memberPreview(values, initial, household, today)
  const lostSponsorships = initial?.deacon && !statuses.deacon && sponsoredHouseholds.length > 0
  const submit = (handler: (v: MemberFormSubmit) => void): (() => Promise<void>) =>
    form.handleSubmit((v) => {
      const checked = toSubmit(v)
      if (checked) handler(checked)
    })
  const revalidate = { shouldValidate: form.formState.isSubmitted }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit(onSubmit)()
      }}
      className="flex flex-col gap-5"
    >
      <DialogHeader>
        <DialogTitle>
          {initial
            ? `Modifier ${memberDisplayName(initial)}`
            : `Ajouter un membre au foyer ${household.number}`}
        </DialogTitle>
        <DialogDescription>
          Les champs marqués * sont obligatoires. Le matricule et l’âge sont calculés.
        </DialogDescription>
      </DialogHeader>

      <MemberSummary household={household} matricule={preview} age={age} />

      {serverError && !serverError.field && (
        <p role="alert" className="text-sm text-destructive">
          {serverError.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <MemberRoleFields
          role={role}
          sex={values.sex ?? ''}
          others={household.members.filter((m) => m.id !== initial?.id)}
          roleError={errorOf('role')}
          sexError={errorOf('sex')}
          roleHint={
            initial && role !== initial.role && preview
              ? `Son matricule deviendra ${preview}.`
              : undefined
          }
          onRoleChange={(v) => form.setValue('role', v, revalidate)}
          onSexChange={(v) => form.setValue('sex', v, revalidate)}
        />
        <FormField id="member-lastName" label="Nom" required error={errorOf('lastName')}>
          <Input
            id="member-lastName"
            autoFocus
            autoComplete="off"
            className="uppercase placeholder:normal-case"
            aria-invalid={invalid('lastName')}
            aria-describedby={describedBy('lastName')}
            {...form.register('lastName', {
              onBlur: (e: React.FocusEvent<HTMLInputElement>) =>
                form.setValue('lastName', normalizeLastName(e.currentTarget.value))
            })}
          />
        </FormField>
        <FormField id="member-firstName" label="Prénom" required error={errorOf('firstName')}>
          <Input
            id="member-firstName"
            autoComplete="off"
            aria-invalid={invalid('firstName')}
            aria-describedby={describedBy('firstName')}
            {...form.register('firstName', {
              onBlur: (e: React.FocusEvent<HTMLInputElement>) =>
                form.setValue('firstName', normalizeFirstName(e.currentTarget.value))
            })}
          />
        </FormField>
        <FormField
          id="member-birthDate"
          label="Date de naissance"
          required
          error={errorOf('birthDate')}
        >
          <Controller
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <DateField
                labelId="member-birthDate-label"
                value={field.value}
                min={MIN_BIRTH_DATE}
                max={today}
                invalid={invalid('birthDate')}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
        <FormField id="member-phone" label="Téléphone" error={errorOf('phone')}>
          <Controller
            control={form.control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                id="member-phone"
                placeholder="034 12 345 67"
                aria-invalid={invalid('phone')}
                aria-describedby={describedBy('phone')}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </FormField>
        <FormField
          id="member-address"
          label="Adresse"
          required
          error={errorOf('address')}
          className="col-span-2"
        >
          <Input
            id="member-address"
            autoComplete="off"
            aria-invalid={invalid('address')}
            aria-describedby={describedBy('address')}
            {...form.register('address')}
          />
        </FormField>
        <StatusFields
          value={statuses}
          deaconWarning={
            lostSponsorships
              ? `Parrain des foyers ${householdNumbersLabel(sponsoredHouseholds)} : ils passeront en « Parrain à désigner ».`
              : undefined
          }
          onChange={(next) => {
            form.setValue('baptized', next.baptized)
            form.setValue('communicant', next.communicant)
            form.setValue('deacon', next.deacon)
          }}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        {!initial && onSubmitAndNext && (
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => void submit(onSubmitAndNext)()}
          >
            Enregistrer et ajouter un autre
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </DialogFooter>
    </form>
  )
}
