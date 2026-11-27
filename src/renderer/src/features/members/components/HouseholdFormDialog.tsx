import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { NativeSelect, NativeSelectOption } from '@renderer/components/ui/native-select'
import type { HouseholdDTO, SponsorDTO } from '@shared/domain/members/households.types'
import type { SectorDTO } from '@shared/domain/members/sectors.types'
import { FormField } from './FormField'
import { SponsorPicker } from './SponsorPicker'

export interface HouseholdFormDialogProps {
  open: boolean
  /** `null` : nouveau foyer */
  initial: HouseholdDTO | null
  sectors: SectorDTO[]
  sponsorOptions: SponsorDTO[]
  onSponsorSearch: (search: string) => void
  submitting: boolean
  serverError: string | null
  onSubmit: (values: { sectorId: number; sponsorId: number | null }) => void
  onCancel: () => void
}

/** Nouveau foyer ou modification : secteur (obligatoire) et parrain (diacre ou à désigner). */
export function HouseholdFormDialog(props: HouseholdFormDialogProps): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent>{props.open && <HouseholdForm {...props} />}</DialogContent>
    </Dialog>
  )
}

function HouseholdForm({
  initial,
  sectors,
  sponsorOptions,
  onSponsorSearch,
  submitting,
  serverError,
  onSubmit,
  onCancel
}: HouseholdFormDialogProps): React.JSX.Element {
  const [sectorId, setSectorId] = useState<number | null>(initial?.sector.id ?? null)
  const [sponsor, setSponsor] = useState<SponsorDTO | null>(initial?.sponsor ?? null)
  const [missingSector, setMissingSector] = useState(false)
  const chosen = sectors.find((s) => s.id === sectorId)
  const sectorChanged = initial !== null && sectorId !== initial.sector.id
  const noSector = sectors.length === 0

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (sectorId === null) return setMissingSector(true)
        onSubmit({ sectorId, sponsorId: sponsor?.id ?? null })
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {initial ? `Modifier le foyer ${initial.number}` : 'Nouveau foyer'}
        </DialogTitle>
        <DialogDescription>
          {initial
            ? 'Le numéro du foyer ne change jamais.'
            : 'Le numéro du foyer est donné automatiquement. Vous ajouterez ensuite ses membres.'}
        </DialogDescription>
      </DialogHeader>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      {noSector ? (
        <p className="text-sm">
          Aucun secteur n’est enregistré.{' '}
          <Link to="/secteurs" className="font-medium underline">
            Créer un secteur
          </Link>
        </p>
      ) : (
        <FormField
          id="household-sector"
          label="Secteur"
          required
          error={missingSector ? 'Choisissez un secteur.' : undefined}
          hint={
            sectorChanged && initial.memberCount > 0 && chosen
              ? `Les matricules des ${initial.memberCount} membres vont changer (secteur ${chosen.numeral}).`
              : undefined
          }
        >
          <NativeSelect
            id="household-sector"
            className="w-full"
            value={sectorId === null ? '' : String(sectorId)}
            aria-invalid={missingSector ? true : undefined}
            onChange={(e) => {
              setMissingSector(false)
              setSectorId(e.currentTarget.value === '' ? null : Number(e.currentTarget.value))
            }}
          >
            <NativeSelectOption value="">Choisir un secteur…</NativeSelectOption>
            {sectors.map((s) => (
              <NativeSelectOption key={s.id} value={String(s.id)}>
                {`${s.numeral} · ${s.name}`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
      )}

      <FormField
        id="household-sponsor"
        label="Parrain"
        hint="Un diacre. Laissez « À désigner » si aucun diacre n’est encore enregistré."
      >
        <SponsorPicker
          id="household-sponsor"
          value={sponsor}
          options={sponsorOptions}
          onSearch={onSponsorSearch}
          onChange={setSponsor}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting || noSector}>
          {initial ? 'Enregistrer' : 'Créer le foyer'}
        </Button>
      </DialogFooter>
    </form>
  )
}
