import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { availableLetters, rootCode } from '@shared/domain/accounting/accounting.codes'
import { normalizePrefix } from '@shared/domain/accounting/accounting.rules'
import {
  descriptionSchema,
  sectionPrefixSchema,
  type AccountingItemDTO
} from '@shared/domain/accounting/accounting.types'
import { selectChevron, selectField } from './accounting.styles'

/** Rubrique de niveau 1 : la description part en majuscules. */
const newRootSchema = z.object({
  prefix: sectionPrefixSchema,
  description: descriptionSchema.toUpperCase()
})
export type NewRootInput = z.output<typeof newRootSchema>
type FormInput = z.input<typeof newRootSchema>

export interface NewSectionFormProps {
  /** Rubriques de niveau 1 existantes : aperçu du numéro qui sera attribué */
  roots: ReadonlyArray<Pick<AccountingItemDTO, 'prefix'>>
  busy: boolean
  onSubmit: (input: NewRootInput) => Promise<void>
  onCancel: () => void
}

/** Numéro qu'aura la prochaine rubrique de cette lettre (aperçu avant création). */
function nextRootCode(prefix: string, roots: NewSectionFormProps['roots']): string {
  const p = normalizePrefix(prefix)
  return rootCode(p, roots.filter((r) => r.prefix === p).length + 1)
}

/**
 * La lettre n'est jamais tapée : on choisit une lettre déjà utilisée (A2, A3…) ou la lettre
 * suivante de l'alphabet malgache (B, puis D…). Le numéro est affiché en direct.
 * La description est mise en majuscules (affichage pendant la saisie, et à l'enregistrement).
 */
export function NewSectionForm({
  roots,
  busy,
  onSubmit,
  onCancel
}: NewSectionFormProps): React.JSX.Element {
  const letters = availableLetters(roots.map((r) => r.prefix ?? ''))
  const newLetter = letters[letters.length - 1]
  // Par défaut : on continue la dernière lettre utilisée (ou A sur un tableau vide)
  const defaultLetter = letters.length > 1 ? letters[letters.length - 2] : newLetter
  const form = useForm<FormInput, unknown, NewRootInput>({
    resolver: zodResolver(newRootSchema),
    defaultValues: { prefix: defaultLetter, description: '' }
  })
  const { errors } = form.formState
  const prefix = useWatch({ control: form.control, name: 'prefix' })
  const preview = nextRootCode(prefix, roots)

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
          Gardez la lettre en cours ou passez à la suivante ; le numéro est automatique.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex w-56 flex-col gap-1.5">
          <Label htmlFor="section-prefix">Lettre</Label>
          <div className="relative">
            <select id="section-prefix" className={selectField} {...form.register('prefix')}>
              {letters.map((letter) => (
                <option key={letter} value={letter}>
                  {letter === newLetter
                    ? `${letter} : nouvelle lettre`
                    : `${letter} : continuer (${nextRootCode(letter, roots)})`}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className={selectChevron} />
          </div>
        </div>
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

      {(errors.prefix || errors.description) && (
        <p role="alert" className="text-sm text-destructive">
          {errors.description?.message ?? `Lettre : ${errors.prefix?.message ?? ''}`}
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
