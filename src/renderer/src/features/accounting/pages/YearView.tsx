import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { printPage } from '@renderer/lib/print'
import { countDescendants } from '@shared/domain/accounting/accounting.tree'
import { defaultOperationDate } from '@shared/domain/accounting/accounting.periods'
import { MAX_YEAR } from '@shared/domain/accounting/accounting.types'
import { AccountingEmptyState } from '../components/AccountingEmptyState'
import { AccountingSheet } from '../components/AccountingSheet'
import { AccountingToolbar } from '../components/AccountingToolbar'
import { ConfirmDeleteDialog, type DeleteTarget } from '../components/ConfirmDeleteDialog'
import { EntriesDialog } from '../components/EntriesDialog'
import { NewSectionForm, type NewRootInput } from '../components/NewSectionForm'
import { PrintHeader } from '../components/PrintHeader'
import { SheetActionsProvider, type SheetActions } from '../components/sheet-actions'
import { YearStepper } from '../components/YearStepper'
import {
  columnLabel,
  columnTarget,
  type AccountingView,
  type AmountColumn
} from '../accounting.utils'
import {
  useAccountingSheet,
  useAddEntry,
  useCellEntries,
  useCreateItem,
  useDeleteEntry,
  useDeleteItem,
  useMoveItem,
  useSetTotal,
  useUpdateEntry,
  useUpdateItem
} from '../queries'

const onError = (err: unknown): void => {
  toast.error(getErrorMessage(err))
}

/** Case dont le détail est ouvert (code et description figés à l'ouverture, pour le titre). */
interface DetailTarget {
  itemId: number
  code: string
  description: string
  col: AmountColumn
}

export interface YearViewProps {
  year: number
  currentYear: number
  onYearChange: (year: number) => void
  onViewChange: (view: AccountingView) => void
}

/** Container de la vue Année : 3 colonnes modifiables, détail des saisies, création, suppression. */
export function YearView({
  year,
  currentYear,
  onYearChange,
  onViewChange
}: YearViewProps): React.JSX.Element {
  const [creating, setCreating] = useState(false)
  const [addingChildTo, setAddingChildTo] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [detail, setDetail] = useState<DetailTarget | null>(null)

  const sheet = useAccountingSheet(year)
  // Année des données affichées (pendant un changement d'année, l'ancien tableau reste visible :
  // une saisie faite à ce moment doit aller dans l'année qu'on voit)
  const shownYear = sheet.data?.year ?? year
  const createItem = useCreateItem()
  const createItemAsync = createItem.mutateAsync
  const { mutate: updateItem } = useUpdateItem()
  const { mutate: deleteItem } = useDeleteItem()
  const { mutate: moveItem } = useMoveItem()
  const { mutate: setTotal } = useSetTotal()
  const { mutateAsync: addEntry } = useAddEntry()
  const { mutateAsync: updateEntry } = useUpdateEntry()
  const { mutate: deleteEntry } = useDeleteEntry()

  const detailCell = detail
    ? { itemId: detail.itemId, ...columnTarget(shownYear, detail.col) }
    : null
  const entries = useCellEntries(detailCell)

  const actions = useMemo<SheetActions>(
    () => ({
      year: shownYear,
      rename: (id, description) => updateItem({ id, description }, { onError }),
      move: (id, direction) => moveItem({ id, direction }, { onError }),
      askDelete: (item) =>
        setDeleteTarget({
          kind: 'item',
          id: item.id,
          code: item.code,
          description: item.description,
          descendantCount: countDescendants(item)
        }),
      setTotal: (itemId, col, amount) =>
        setTotal({ year: shownYear, itemId, col, amount }, { onError }),
      openDetail: (item, col) =>
        setDetail({ itemId: item.id, code: item.code, description: item.description, col }),
      openAddChild: setAddingChildTo,
      addChild: async (parentId, description) => {
        try {
          await createItemAsync({ parentId, description })
        } catch (err) {
          onError(err)
          throw err // le formulaire garde la saisie
        }
      }
    }),
    [shownYear, updateItem, moveItem, setTotal, createItemAsync]
  )

  /** Écriture depuis le détail : toast en cas d'erreur, rejet pour garder la saisie. */
  const withToast = async (run: () => Promise<unknown>): Promise<void> => {
    try {
      await run()
    } catch (err) {
      onError(err)
      throw err
    }
  }

  const submitRoot = async (input: NewRootInput): Promise<void> => {
    try {
      const created = await createItem.mutateAsync({ parentId: null, ...input })
      setCreating(false)
      setAddingChildTo(created.id) // on enchaîne directement sur les sous-rubriques
    } catch (err) {
      onError(err)
    }
  }

  const confirmDelete = (target: DeleteTarget): void => {
    setDeleteTarget(null)
    if (target.kind === 'item') {
      deleteItem(target.id, {
        onSuccess: () => toast.success(`Rubrique ${target.code} supprimée`),
        onError
      })
    } else {
      deleteEntry(target.id, { onSuccess: () => toast.success('Saisie supprimée'), onError })
    }
  }

  const items = sheet.data?.items ?? []
  return (
    <div className="flex flex-col gap-5">
      <AccountingToolbar
        view="year"
        onViewChange={onViewChange}
        navigation={<YearStepper year={year} currentYear={currentYear} onChange={onYearChange} />}
        onPrint={() => void printPage().catch(onError)}
        onNewSection={() => setCreating(true)}
        creating={creating}
      />
      <PrintHeader title={`Année ${shownYear}`} printedAt={new Date()} />

      {creating && (
        <div data-print="hide">
          <NewSectionForm
            roots={items}
            busy={createItem.isPending}
            onSubmit={submitRoot}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {sheet.isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {sheet.isError && (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {getErrorMessage(sheet.error)}
          <Button variant="outline" size="sm" onClick={() => void sheet.refetch()}>
            Réessayer
          </Button>
        </div>
      )}
      {sheet.data && items.length === 0 && !creating && (
        <AccountingEmptyState onCreate={() => setCreating(true)} />
      )}
      {items.length > 0 && (
        <SheetActionsProvider value={actions}>
          <AccountingSheet year={shownYear} items={items} addingChildTo={addingChildTo} />
        </SheetActionsProvider>
      )}

      {detail && detailCell && (
        <EntriesDialog
          open
          title={`${columnLabel(shownYear, detail.col)} de ${detail.code}`}
          subtitle={detail.description}
          entries={entries.data}
          loading={entries.isPending}
          error={entries.isError ? entries.error : null}
          disabled={detailCell.year > MAX_YEAR}
          dates={
            detailCell.type === 'actual'
              ? {
                  min: `${detailCell.year}-01-01`,
                  max: `${detailCell.year}-12-31`,
                  initial: defaultOperationDate(new Date(), detailCell.year)
                }
              : null
          }
          onAdd={(amount, label, operatedOn) =>
            withToast(() => addEntry({ ...detailCell, amount, label, operatedOn }))
          }
          onUpdate={(id, amount, label, operatedOn) =>
            withToast(() => updateEntry({ id, amount, label, operatedOn }))
          }
          onAskDelete={(entry) =>
            setDeleteTarget({
              kind: 'entry',
              id: entry.id,
              itemCode: detail.code,
              label: entry.label,
              amount: entry.amount
            })
          }
          onRetry={() => void entries.refetch()}
          onClose={() => setDetail(null)}
        />
      )}

      <ConfirmDeleteDialog
        target={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
