import { Plus, Search } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@renderer/components/ui/native-select'
import type { SectorDTO } from '@shared/domain/members/sectors.types'

export interface HouseholdsToolbarProps {
  search: string
  onSearchChange: (search: string) => void
  sectors: SectorDTO[]
  sectorId: number | undefined
  onSectorChange: (sectorId: number | undefined) => void
  sponsorMissing: boolean
  onSponsorMissingChange: (value: boolean) => void
  onCreate: () => void
  /** « 2 275 foyers » ; '' pendant le premier chargement */
  resultLabel: string
}

/** Recherche (numéro ou nom d'un membre), filtres, et création d'un foyer. */
export function HouseholdsToolbar(p: HouseholdsToolbarProps): React.JSX.Element {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Rechercher un foyer"
            placeholder="Numéro du foyer ou nom d’un membre…"
            className="pl-9"
            value={p.search}
            onChange={(e) => p.onSearchChange(e.currentTarget.value)}
          />
        </div>
        <NativeSelect
          aria-label="Secteur"
          value={p.sectorId === undefined ? '' : String(p.sectorId)}
          onChange={(e) =>
            p.onSectorChange(
              e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value)
            )
          }
        >
          <NativeSelectOption value="">Tous les secteurs</NativeSelectOption>
          {p.sectors.map((s) => (
            <NativeSelectOption key={s.id} value={String(s.id)}>
              {`${s.numeral} · ${s.name}`}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={p.sponsorMissing}
            onChange={(e) => p.onSponsorMissingChange(e.currentTarget.checked)}
          />
          Parrain à désigner
        </label>
        <Button onClick={p.onCreate}>
          <Plus aria-hidden />
          Nouveau foyer
        </Button>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {p.resultLabel}
      </p>
    </div>
  )
}
