import { Pencil, Trash2 } from 'lucide-react'
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
import { getErrorMessage } from '@renderer/lib/error-messages'
import { cellOf } from '@shared/domain/accounting/accounting.rules'
import type { EntryDTO } from '@shared/domain/accounting/accounting.types'
import { formatDateTime } from '@shared/utils/dates'
import { formatAmount } from '@shared/utils/money'
import { operationDateLabel } from '../accounting.utils'
import { EntryForm, type OperationDateBounds } from './EntryForm'

export interface EntriesDialogProps {
  open: boolean
  /** « Réalisation 2026 de F1-II-1 A) » */
  title: string
  /** Description de la rubrique */
  subtitle: string
  entries: EntryDTO[] | undefined
  loading: boolean
  error: unknown
  /** Case non modifiable (ex. Estimation 2201) */
  disabled: boolean
  /** Réalisation : bornes de la date d'opération ; `null` pour une estimation */
  dates: OperationDateBounds | null
  onAdd: (amount: number, label: string | null, operatedOn: string | null) => Promise<void>
  onUpdate: (
    id: number,
    amount: number,
    label: string | null,
    operatedOn: string | null
  ) => Promise<void>
  onAskDelete: (entry: EntryDTO) => void
  onRetry: () => void
  onClose: () => void
}

const nameOf = (entry: EntryDTO): string => entry.label ?? 'sans libellé'

/** Détail d'une case : chaque saisie avec son libellé, son montant, sa date et son heure. */
export function EntriesDialog({
  open,
  title,
  subtitle,
  entries,
  loading,
  error,
  disabled,
  dates,
  onAdd,
  onUpdate,
  onAskDelete,
  onRetry,
  onClose
}: EntriesDialogProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<number | null>(null)
  const total = cellOf(entries ?? []).total

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {error != null && (
          <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
            {getErrorMessage(error)}
            <Button variant="outline" size="sm" onClick={onRetry}>
              Réessayer
            </Button>
          </div>
        )}
        {entries && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune saisie</p>
        )}
        {entries && entries.length > 0 && (
          <ul className="flex flex-col divide-y rounded-lg border">
            {entries.map((entry) => (
              <li key={entry.id} className="group flex flex-col gap-1 px-3 py-2">
                {editingId === entry.id ? (
                  <EntryForm
                    target={`de la saisie ${nameOf(entry)}`}
                    initial={entry}
                    dates={dates}
                    submitLabel="Enregistrer"
                    disabled={disabled}
                    onSubmit={async (amount, label, operatedOn) => {
                      await onUpdate(entry.id, amount, label, operatedOn)
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={entry.label ? 'truncate' : 'text-muted-foreground italic'}>
                        {entry.label ?? 'Sans libellé'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.operatedOn && (
                          <span className="font-medium text-foreground">
                            Opération du {operationDateLabel(entry.operatedOn)} ·{' '}
                          </span>
                        )}
                        <span>saisi le {formatDateTime(new Date(entry.createdAt))}</span>
                        {entry.updatedAt !== entry.createdAt && (
                          <span> · modifié le {formatDateTime(new Date(entry.updatedAt))}</span>
                        )}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">{formatAmount(entry.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Modifier"
                      aria-label={`Modifier la saisie ${nameOf(entry)}`}
                      disabled={disabled}
                      onClick={() => setEditingId(entry.id)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Supprimer"
                      aria-label={`Supprimer la saisie ${nameOf(entry)}`}
                      className="hover:bg-destructive/10 hover:text-destructive"
                      disabled={disabled}
                      onClick={() => onAskDelete(entry)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <EntryForm
          target="de la nouvelle saisie"
          dates={dates}
          submitLabel="Ajouter"
          disabled={disabled || entries === undefined}
          onSubmit={onAdd}
        />

        <DialogFooter className="sm:justify-between">
          <p className="self-center font-medium tabular-nums">
            Total : {total === null ? 'aucun montant' : formatAmount(total)}
          </p>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
