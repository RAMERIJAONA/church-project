import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { DateField } from '@renderer/components/common/DateField'
import { SegmentedControl } from '@renderer/components/common/SegmentedControl'
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
  type MemberFormValues
} from '../forms/member-form.schema'
import type { MemberServerError } from '../members.utils'
import { FormField } from './FormField'
import { PhoneInput } from './PhoneInput'

export interface MemberFormDialogProps {
  open: boolean
  /** `null` : ajout */
  initial: MemberDTO | null
  /** « AAAA-MM-JJ » : date de naissance maximale */
  today: string
  submitting: boolean
  serverError: MemberServerError | null
  onSubmit: (values: MemberFormValues) => void
  onCancel: () => void
}

const YES_NO = [
  { value: 'yes', label: 'Oui' },
  { value: 'no', label: 'Non' }
] as const

/** Ajout ou modification d'un fidèle (le formulaire repart de zéro à chaque ouverture). */
export function MemberFormDialog(props: MemberFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      {/* Un clic à côté ne ferme pas : 9 champs saisis ne doivent pas se perdre (Échap et
          « Annuler » ferment toujours) */}
      <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <MemberForm {...props} />
      </DialogContent>
    </Dialog>
  )
}

function MemberForm({
  initial,
  today,
  submitting,
  serverError,
  onSubmit,
  onCancel
}: MemberFormDialogProps): React.JSX.Element {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(makeMemberFormSchema(today)),
    defaultValues: memberFormDefaults(initial)
  })
  const { errors } = form.formState
  const baptized = useWatch({ control: form.control, name: 'baptized' })
  const errorOf = (field: keyof MemberFormValues): string | undefined =>
    errors[field]?.message ?? (serverError?.field === field ? serverError.message : undefined)
  const invalid = (field: keyof MemberFormValues): true | undefined =>
    errorOf(field) ? true : undefined
  const describedBy = (field: keyof MemberFormValues): string | undefined =>
    errorOf(field) ? `member-${field}-error` : undefined

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-5"
    >
      <DialogHeader>
        <DialogTitle>
          {initial ? `Modifier ${memberDisplayName(initial)}` : 'Ajouter un fidèle'}
        </DialogTitle>
        <DialogDescription>
          Les champs marqués * sont obligatoires. Le nom est enregistré en majuscules.
        </DialogDescription>
      </DialogHeader>

      {serverError && !serverError.field && (
        <p role="alert" className="text-sm text-destructive">
          {serverError.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
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
        <FormField id="member-baptized" label="Baptême">
          <Controller
            control={form.control}
            name="baptized"
            render={({ field }) => (
              <SegmentedControl
                label="Baptême"
                value={field.value ? 'yes' : 'no'}
                options={YES_NO}
                onValueChange={(v) => {
                  field.onChange(v === 'yes')
                  // Un membre communiant est toujours baptisé
                  if (v === 'no') form.setValue('communicant', false)
                }}
              />
            )}
          />
        </FormField>
        <FormField
          id="member-communicant"
          label="Membre communiant"
          error={errorOf('communicant')}
          hint={baptized ? undefined : 'Un membre communiant est toujours baptisé.'}
        >
          <Controller
            control={form.control}
            name="communicant"
            render={({ field }) => (
              <SegmentedControl
                label="Membre communiant"
                value={field.value ? 'yes' : 'no'}
                options={YES_NO}
                disabled={!baptized}
                onValueChange={(v) => field.onChange(v === 'yes')}
              />
            )}
          />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </DialogFooter>
    </form>
  )
}
