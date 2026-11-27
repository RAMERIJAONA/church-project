import { X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@renderer/components/ui/native-select'
import { SEX_LABELS, SEXES } from '@shared/domain/members/households.rules'
import type { SectorDTO } from '@shared/domain/members/sectors.types'
import type { MemberListFilters } from '../members-list-params'

export interface MembersFiltersProps {
  sectors: SectorDTO[]
  filters: MemberListFilters
  hasFilters: boolean
  onChange: (patch: Partial<MemberListFilters>) => void
  onClear: () => void
}

type Flag = 'baptized' | 'communicant' | 'deacon'
const FLAGS: ReadonlyArray<{ key: Flag; label: string }> = [
  { key: 'baptized', label: 'Baptisé' },
  { key: 'communicant', label: 'Communiant' },
  { key: 'deacon', label: 'Diacre' }
]

const flagValue = (v: boolean | undefined): string => (v === undefined ? '' : v ? 'oui' : 'non')
const parseFlag = (v: string): boolean | undefined => (v === '' ? undefined : v === 'oui')

/** Filtres de la liste globale, sur une ligne : secteur, foyer, sexe, statuts. */
export function MembersFilters({
  sectors,
  filters,
  hasFilters,
  onChange,
  onClear
}: MembersFiltersProps): React.JSX.Element {
  return (
    <div role="group" aria-label="Filtres" className="flex shrink-0 flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Secteur"
        value={filters.sectorId === undefined ? '' : String(filters.sectorId)}
        onChange={(e) =>
          onChange({
            sectorId: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value)
          })
        }
      >
        <NativeSelectOption value="">Tous les secteurs</NativeSelectOption>
        {sectors.map((s) => (
          <NativeSelectOption key={s.id} value={String(s.id)}>
            {`${s.numeral} · ${s.name}`}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Input
        aria-label="Numéro du foyer"
        placeholder="Foyer n°"
        inputMode="numeric"
        className="w-28"
        value={filters.householdNumber === undefined ? '' : String(filters.householdNumber)}
        onChange={(e) => {
          const digits = e.currentTarget.value.replace(/\D/g, '').replace(/^0+/, '')
          onChange({ householdNumber: digits === '' ? undefined : Number(digits) })
        }}
      />
      <NativeSelect
        aria-label="Sexe"
        value={filters.sex ?? ''}
        onChange={(e) => onChange({ sex: SEXES.find((s) => s === e.currentTarget.value) })}
      >
        <NativeSelectOption value="">Les deux sexes</NativeSelectOption>
        {SEXES.map((s) => (
          <NativeSelectOption key={s} value={s}>
            {SEX_LABELS[s]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {FLAGS.map(({ key, label }) => (
        <NativeSelect
          key={key}
          aria-label={label}
          value={flagValue(filters[key])}
          onChange={(e) => onChange({ [key]: parseFlag(e.currentTarget.value) })}
        >
          <NativeSelectOption value="">{`${label} : tous`}</NativeSelectOption>
          <NativeSelectOption value="oui">{`${label} : oui`}</NativeSelectOption>
          <NativeSelectOption value="non">{`${label} : non`}</NativeSelectOption>
        </NativeSelect>
      ))}
      {hasFilters && (
        <Button variant="ghost" onClick={onClear}>
          <X aria-hidden />
          Effacer les filtres
        </Button>
      )}
    </div>
  )
}
