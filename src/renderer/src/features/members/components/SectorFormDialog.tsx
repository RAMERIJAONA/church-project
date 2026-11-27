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
import { normalizeSectorName } from '@shared/domain/members/sectors.rules'
import type { SectorDTO } from '@shared/domain/members/sectors.types'
import { FormField } from './FormField'

export interface SectorFormDialogProps {
  open: boolean
  /** `null` : ajout */
  initial: SectorDTO | null
  /** Numéro que recevra un nouveau secteur : « III » */
  nextNumeral: string
  submitting: boolean
  /** Message du service (nom déjà pris…) */
  serverError: string | null
  onSubmit: (name: string) => void
  onCancel: () => void
}

/** Ajout ou renommage d'un secteur ; le numéro ne change jamais. */
export function SectorFormDialog(props: SectorFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent>{props.open && <SectorForm {...props} />}</DialogContent>
    </Dialog>
  )
}

function SectorForm({
  initial,
  nextNumeral,
  submitting,
  serverError,
  onSubmit,
  onCancel
}: SectorFormDialogProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [missing, setMissing] = useState(false)
  const numeral = initial?.numeral ?? nextNumeral
  const preview = normalizeSectorName(name)
  const error = missing ? 'Le nom est obligatoire.' : (serverError ?? undefined)

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (preview === '') return setMissing(true)
        onSubmit(name)
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {initial ? `Renommer le secteur ${initial.numeral}` : 'Ajouter un secteur'}
        </DialogTitle>
        <DialogDescription>
          Chaque mot commence par une majuscule. Le numéro est donné dans l’ordre de création et ne
          change jamais.
        </DialogDescription>
      </DialogHeader>
      <FormField id="sector-name" label="Nom" required error={error}>
        <Input
          id="sector-name"
          autoFocus
          autoComplete="off"
          value={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'sector-name-error' : undefined}
          onChange={(e) => {
            setMissing(false)
            setName(e.currentTarget.value)
          }}
        />
      </FormField>
      {preview !== '' && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Sera enregistré : {preview} (n° {numeral})
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {initial ? 'Renommer' : 'Ajouter'}
        </Button>
      </DialogFooter>
    </form>
  )
}
