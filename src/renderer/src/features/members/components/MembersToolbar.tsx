import { Search } from 'lucide-react'
import { useId } from 'react'
import { Input } from '@renderer/components/ui/input'

export interface MembersToolbarProps {
  search: string
  onSearchChange: (search: string) => void
  /** « 1 248 fidèles », « 3 résultats pour « rakto » » ; '' pendant le premier chargement */
  resultLabel: string
}

/** Recherche en temps réel (les fidèles s'ajoutent depuis leur foyer). */
export function MembersToolbar({
  search,
  onSearchChange,
  resultLabel
}: MembersToolbarProps): React.JSX.Element {
  const labelId = useId()
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <span id={labelId} className="sr-only">
            Rechercher un fidèle
          </span>
          <Input
            type="search"
            aria-labelledby={labelId}
            placeholder="Rechercher par nom, prénom ou matricule…"
            className="pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {resultLabel}
      </p>
    </div>
  )
}
