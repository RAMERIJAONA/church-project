import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import type { SponsorDTO } from '@shared/domain/members/households.types'
import { memberDisplayName } from '@shared/domain/members/members.rules'
import { missingText, pickerOption } from './members.styles'

export interface SponsorPickerProps {
  /** Id du bouton (libellé « Parrain » du formulaire) */
  id: string
  value: SponsorDTO | null
  /** Diacres proposés pour la recherche en cours */
  options: SponsorDTO[]
  onSearch: (search: string) => void
  onChange: (sponsor: SponsorDTO | null) => void
}

/** Parrain d'un foyer : un diacre, ou « À désigner ». Seuls les diacres sont proposés. */
export function SponsorPicker({
  id,
  value,
  options,
  onSearch,
  onChange
}: SponsorPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const choose = (sponsor: SponsorDTO | null): void => {
    onChange(sponsor)
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" className="justify-between font-normal">
          {value ? (
            `${memberDisplayName(value)} (${value.matricule})`
          ) : (
            <span className={missingText}>À désigner</span>
          )}
          <ChevronDown aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-80 flex-col gap-2 p-2">
        <Input
          type="search"
          aria-label="Rechercher un diacre"
          placeholder="Rechercher un diacre…"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value)
            onSearch(e.currentTarget.value)
          }}
        />
        <div role="listbox" aria-label="Diacres" className="flex max-h-64 flex-col overflow-y-auto">
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            className={pickerOption}
            onClick={() => choose(null)}
          >
            À désigner
          </button>
          {options.map((s) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={value?.id === s.id}
              className={pickerOption}
              onClick={() => choose(s)}
            >
              <span>{memberDisplayName(s)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{s.matricule}</span>
            </button>
          ))}
          {options.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Aucun diacre trouvé.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
