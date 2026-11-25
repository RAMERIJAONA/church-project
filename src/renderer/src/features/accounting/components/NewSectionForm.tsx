import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { nextLetter, rootCode } from '@shared/domain/accounting/accounting.codes'
import {
  descriptionSchema,
  type AccountingItemDTO,
  type Ledger
} from '@shared/domain/accounting/accounting.types'

/** Rubrique de niveau 1 : la description part en majuscules ; la lettre est attribuée. */
const newRootSchema = z.object({ description: descriptionSchema.toUpperCase() })
export type NewRootInput = z.output<typeof newRootSchema>
type FormInput = z.input<typeof newRootSchema>

export interface NewSectionFormProps {
  /** Comptabilité : premier numéro du niveau 1 (sorties A1, entrées A2) */
  ledger: Ledger
  /** Rubriques de niveau 1 existantes : aperçu du numéro qui sera attribué */
  roots: ReadonlyArray<Pick<AccountingItemDTO, 'prefix'>>
  busy: boolean
  onSubmit: (input: NewRootInput) => Promise<void>
  onCancel: () => void
}

/**
 * La lettre n'est jamais choisie : une lettre par rubrique principale, toujours la suivante de
 * l'alphabet malgache (A, B, D…), chiffre fixe par comptabilité (sorties A1, entrées A2).
 * La description est mise en majuscules (affichage pendant la saisie, et à l'enregistrement).
 */
export function NewSectionForm({
  ledger,
  roots,
  busy,
  onSubmit,
  onCancel
}: NewSectionFormProps): React.JSX.Element {
  const preview = rootCode(nextLetter(roots.map((r) => r.prefix ?? '')), ledger)
  const form = useForm<FormInput, unknown, NewRootInput>({
    resolver: zodResolver(newRootSchema),
    defaultValues: { description: '' }
  })
  const { errors } = form.formState

  return (
    <form
      aria-labelledby="new-section-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
      onSubmit={form.handleSubmit(onSubmit)}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div>
        <h2 id="new-section-title" className="font-display text-lg font-semibold">
          Nouvelle rubrique
        </h2>
        <p className="text-sm text-muted-foreground">
          Le numéro est automatique : la lettre suivante de l’alphabet malgache.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-64 flex-1 flex-col gap-1.5">
          <Label htmlFor="section-description">Description</Label>
          <Input
            id="section-description"
            autoFocus
            maxLength={200}
            autoComplete="off"
            placeholder="ex. ASA IOMBONANA"
            className="uppercase placeholder:normal-case"
            aria-invalid={errors.description ? true : undefined}
            {...form.register('description')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm leading-none font-medium">Numéro attribué</span>
          <output
            aria-label="Numéro attribué"
            className="flex h-8 min-w-16 items-center justify-center rounded-lg bg-accent px-3 font-display text-base font-semibold text-accent-foreground tabular-nums"
          >
            {preview}
          </output>
        </div>
      </div>

      {errors.description && (
        <p role="alert" className="text-sm text-destructive">
          {errors.description.message}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={busy}>
          Créer la rubrique
        </Button>
      </div>
    </form>
  )
}
