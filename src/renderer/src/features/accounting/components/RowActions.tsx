import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { rowActions } from './accounting.styles'

export interface RowActionsProps {
  /** Numéro de l'élément (A1, A1-2), pour des libellés accessibles non ambigus */
  code: string
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onMove: (direction: 'up' | 'down') => void
  onDelete: () => void
}

/** Boutons d'icône avec infobulle (title) et nom accessible complet. */
export function RowActions({
  code,
  isFirst,
  isLast,
  onEdit,
  onMove,
  onDelete
}: RowActionsProps): React.JSX.Element {
  return (
    <div className={rowActions}>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Modifier la description"
        aria-label={`Modifier ${code}`}
        onClick={onEdit}
      >
        <Pencil aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Monter"
        aria-label={`Monter ${code}`}
        disabled={isFirst}
        onClick={() => onMove('up')}
      >
        <ArrowUp aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Descendre"
        aria-label={`Descendre ${code}`}
        disabled={isLast}
        onClick={() => onMove('down')}
      >
        <ArrowDown aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Supprimer"
        aria-label={`Supprimer ${code}`}
        className="hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 aria-hidden />
      </Button>
    </div>
  )
}
