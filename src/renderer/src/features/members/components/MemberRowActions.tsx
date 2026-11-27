import { ArrowRightLeft, Ellipsis, House, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { menuItem, rowActions } from './members.styles'

export interface MemberRowActionsProps {
  /** « RAKOTO Tiana », pour des libellés accessibles non ambigus */
  name: string
  /** Absent : la ligne a déjà son bouton Modifier visible (page d'un foyer) */
  onEdit?: () => void
  onDelete: () => void
  /** Page d'un foyer : déplacer vers un autre foyer */
  onMove?: () => void
  /** Liste globale : ouvrir le foyer du fidèle */
  onOpenHousehold?: () => void
}

/** Menu « ⋯ » d'une ligne : Modifier, Voir le foyer ou Déplacer, Supprimer. */
export function MemberRowActions({
  name,
  onEdit,
  onDelete,
  onMove,
  onOpenHousehold
}: MemberRowActionsProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const select = (action: () => void): void => {
    setOpen(false)
    action()
  }
  return (
    <div className={rowActions}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" title="Actions" aria-label={`Actions de ${name}`}>
            <Ellipsis aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-44 flex-col gap-0.5 p-1">
          {onEdit && (
            <Button
              variant="ghost"
              className={menuItem}
              aria-label={`Modifier ${name}`}
              onClick={() => select(onEdit)}
            >
              <Pencil aria-hidden />
              Modifier
            </Button>
          )}
          {onOpenHousehold && (
            <Button
              variant="ghost"
              className={menuItem}
              aria-label={`Voir le foyer de ${name}`}
              onClick={() => select(onOpenHousehold)}
            >
              <House aria-hidden />
              Voir le foyer
            </Button>
          )}
          {onMove && (
            <Button
              variant="ghost"
              className={menuItem}
              aria-label={`Déplacer ${name}`}
              onClick={() => select(onMove)}
            >
              <ArrowRightLeft aria-hidden />
              Déplacer
            </Button>
          )}
          <Button
            variant="ghost"
            className={`${menuItem} text-destructive hover:bg-destructive/10 hover:text-destructive`}
            aria-label={`Supprimer ${name}`}
            onClick={() => select(onDelete)}
          >
            <Trash2 aria-hidden />
            Supprimer
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
