import { Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { menuItem, rowActions } from './accounting.styles'

export interface RowActionsProps {
  /** Numéro de l'élément (F1, F1-II-1 A)), pour des libellés accessibles non ambigus */
  code: string
  /** Raison pour laquelle on ne peut pas ajouter de sous-rubrique, `null` si possible */
  addChildBlockedReason: string | null
  onAddChild: () => void
  onEdit: () => void
  onDelete: () => void
}

/**
 * « + » (ajouter une sous-rubrique, l'action courante) toujours à portée ; Modifier et Supprimer
 * dans un menu « ⋯ » : la colonne reste étroite et laisse la place aux montants (2026-11-25).
 * Pas de Monter / Descendre (retiré à la demande du porteur, 2026-11-25).
 */
export function RowActions({
  code,
  addChildBlockedReason,
  onAddChild,
  onEdit,
  onDelete
}: RowActionsProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  // « Modifier » : le focus va au champ de description, pas de retour sur le bouton « ⋯ »
  const keepFocus = useRef(false)
  const select = (action: () => void, focusElsewhere = false): void => {
    keepFocus.current = focusElsewhere
    setOpen(false)
    action()
  }

  return (
    <div className={rowActions}>
      <Button
        variant="ghost"
        size="icon-sm"
        title={addChildBlockedReason ?? 'Ajouter une sous-rubrique'}
        aria-label={`Ajouter une sous-rubrique à ${code}`}
        disabled={addChildBlockedReason !== null}
        onClick={onAddChild}
      >
        <Plus aria-hidden />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Autres actions"
            aria-label={`Actions de ${code}`}
          >
            <Ellipsis aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="flex w-44 flex-col gap-0.5 p-1"
          onCloseAutoFocus={(e) => {
            if (keepFocus.current) e.preventDefault()
            keepFocus.current = false
          }}
        >
          <Button
            variant="ghost"
            className={menuItem}
            aria-label={`Modifier ${code}`}
            onClick={() => select(onEdit, true)}
          >
            <Pencil aria-hidden />
            Modifier
          </Button>
          <Button
            variant="ghost"
            className={`${menuItem} text-destructive hover:bg-destructive/10 hover:text-destructive`}
            aria-label={`Supprimer ${code}`}
            onClick={() => select(onDelete, true)}
          >
            <Trash2 aria-hidden />
            Supprimer
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
