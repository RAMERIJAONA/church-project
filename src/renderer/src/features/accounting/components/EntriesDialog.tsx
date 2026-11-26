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
import type { DateRange } from '@shared/domain/accounting/accounting.periods'
import { cellOf } from '@shared/domain/accounting/accounting.rules'
import type { EntryDTO } from '@shared/domain/accounting/accounting.types'
import { formatDateTime } from '@shared/utils/dates'
import { formatAriary } from '@shared/utils/money'
import { entriesSavedIn, entriesSavedRange, newestFirst } from '../accounting.utils'
import { EntriesFilter } from './EntriesFilter'
import { EntryForm } from './EntryForm'

export interface EntriesDialogProps {
  open: boolean
  /** « Réalisation 2026 de F1-II-1 A) » */
  title: string
  /** Description de la rubrique */
  subtitle: string
  entries: EntryDTO[] | undefined
  loading: boolean
  error: unknown
  /** Année de la case : une saisie faite après cette année affiche l'année seule */
  year: number
  /** Date locale du jour, « AAAA-MM-JJ » (fin de la période du filtre par défaut) */
  today: string
  /** Case non modifiable (ex. Estimation 2201) */
  disabled: boolean
  onAdd: (amount: number, label: string | null) => Promise<void>
  onUpdate: (id: number, amount: number, label: string | null) => Promise<void>
  onAskDelete: (entry: EntryDTO) => void
  onRetry: () => void
  onClose: () => void
}

const nameOf = (entry: EntryDTO): string => entry.label ?? 'sans libellé'

/** « Saisi le 25 novembre 2026 à 14:32 », ou « Saisi après la clôture de 2025 » (année seule). */
function savedLabel(at: string, year: number, verb: 'Saisi' | 'modifié'): string {
  const date = new Date(at)
  return date.getFullYear() > year ? `${verb} après ${year}` : `${verb} le ${formatDateTime(date)}`
}

/** Détail d'une case : chaque saisie avec son libellé, son montant, sa date et son heure. */
export function EntriesDialog({
  open,
  title,
  subtitle,
  entries,
  loading,
  error,
  year,
  today,
  disabled,
  onAdd,
  onUpdate,
  onAskDelete,
  onRetry,
  onClose
}: EntriesDialogProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<number | null>(null)
  // Filtre par date de saisie ; `null` : toutes les dates
  const [filter, setFilter] = useState<DateRange | null>(null)
  const all = entries ?? []
  const shown = newestFirst(filter ? entriesSavedIn(all, filter) : all)
  const total = cellOf(all).total
  const shownTotal = cellOf(shown).total
  const money = (value: number | null): string =>
    value === null ? 'aucun montant' : formatAriary(value)

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
          <EntriesFilter
            range={filter ?? entriesSavedRange(entries, today)}
            filtered={filter !== null}
            shownCount={shown.length}
            totalCount={entries.length}
            onChange={setFilter}
            onReset={() => setFilter(null)}
          />
        )}
        {entries && entries.length > 0 && shown.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune saisie sur cette période</p>
        )}
        {shown.length > 0 && (
          <ul className="flex flex-col divide-y rounded-lg border">
            {shown.map((entry) => (
              <li key={entry.id} className="group flex flex-col gap-1 px-3 py-2">
                {editingId === entry.id ? (
                  <EntryForm
                    target={`de la saisie ${nameOf(entry)}`}
                    initial={entry}
                    submitLabel="Enregistrer"
                    disabled={disabled}
                    onSubmit={async (amount, label) => {
                      await onUpdate(entry.id, amount, label)
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
                        <span>{savedLabel(entry.createdAt, year, 'Saisi')}</span>
                        {entry.updatedAt !== entry.createdAt && (
                          <span> · {savedLabel(entry.updatedAt, year, 'modifié')}</span>
                        )}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">{formatAriary(entry.amount)}</span>
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
          submitLabel="Ajouter"
          disabled={disabled || entries === undefined}
          onSubmit={onAdd}
        />

        <DialogFooter className="sm:justify-between">
          {filter ? (
            <div className="self-center font-medium tabular-nums">
              <p>Total des saisies filtrées : {money(shownTotal)}</p>
              <p>Total de la case : {money(total)}</p>
            </div>
          ) : (
            <p className="self-center font-medium tabular-nums">Total : {money(total)}</p>
          )}
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
