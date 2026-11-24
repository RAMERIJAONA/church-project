import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { yearSchema, type CreateSectionInput } from '@shared/domain/accounting/accounting.types'
import { AccountingEmptyState } from '../components/AccountingEmptyState'
import { AccountingSheet } from '../components/AccountingSheet'
import { AccountingToolbar } from '../components/AccountingToolbar'
import { ConfirmDeleteDialog, type DeleteTarget } from '../components/ConfirmDeleteDialog'
import { NewSectionForm } from '../components/NewSectionForm'
import { SheetActionsProvider, type SheetActions } from '../components/sheet-actions'
import {
  useAccountingSheet,
  useCreateLine,
  useCreateSection,
  useDeleteLine,
  useDeleteSection,
  useMoveLine,
  useMoveSection,
  useSetAmount,
  useUpdateLine,
  useUpdateSection
} from '../queries'

const onError = (err: unknown): void => {
  toast.error(getErrorMessage(err))
}

/** Container : année (dans l'URL, conservée en changeant de page), données, actions. */
export function AccountingPage(): React.JSX.Element {
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const [params, setParams] = useSearchParams()
  const fromUrl = yearSchema.safeParse(Number(params.get('annee')))
  const year = fromUrl.success ? fromUrl.data : currentYear
  const setYear = (y: number): void => setParams({ annee: String(y) }, { replace: true })

  const [creating, setCreating] = useState(false)
  const [addingLineTo, setAddingLineTo] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const sheet = useAccountingSheet(year)
  // Année des données affichées (pendant un changement d'année, l'ancien tableau reste visible :
  // une saisie faite à ce moment doit aller dans l'année qu'on voit)
  const shownYear = sheet.data?.year ?? year
  const createSection = useCreateSection()
  const { mutate: updateSection } = useUpdateSection()
  const { mutate: deleteSection } = useDeleteSection()
  const { mutate: moveSection } = useMoveSection()
  const { mutateAsync: createLine } = useCreateLine()
  const { mutate: updateLine } = useUpdateLine()
  const { mutate: deleteLine } = useDeleteLine()
  const { mutate: moveLine } = useMoveLine()
  const { mutate: setAmount } = useSetAmount()

  const actions = useMemo<SheetActions>(
    () => ({
      year: shownYear,
      renameSection: (id, description) => updateSection({ id, description }, { onError }),
      moveSection: (id, direction) => moveSection({ id, direction }, { onError }),
      askDeleteSection: (s) =>
        setDeleteTarget({
          kind: 'section',
          id: s.id,
          code: s.code,
          description: s.description,
          lineCount: s.lines.length
        }),
      renameLine: (id, description) => updateLine({ id, description }, { onError }),
      moveLine: (id, direction) => moveLine({ id, direction }, { onError }),
      askDeleteLine: (l) =>
        setDeleteTarget({ kind: 'line', id: l.id, code: l.code, description: l.description }),
      setAmount: (lineId, amount) => setAmount({ lineId, year: shownYear, amount }, { onError }),
      openAddLine: setAddingLineTo,
      addLine: async (sectionId, description, amount) => {
        try {
          await createLine({ sectionId, description, amount, year: shownYear })
        } catch (err) {
          onError(err)
          throw err // le formulaire garde la saisie
        }
      }
    }),
    [shownYear, updateSection, moveSection, updateLine, moveLine, setAmount, createLine]
  )

  const submitSection = async (input: CreateSectionInput): Promise<void> => {
    try {
      const created = await createSection.mutateAsync(input)
      setCreating(false)
      setAddingLineTo(created.id) // on enchaîne directement sur la saisie des lignes
    } catch (err) {
      onError(err)
    }
  }

  const confirmDelete = (target: DeleteTarget): void => {
    setDeleteTarget(null)
    const label = target.kind === 'section' ? `Rubrique ${target.code}` : `Ligne ${target.code}`
    const options = { onSuccess: () => toast.success(`${label} supprimée`), onError }
    if (target.kind === 'section') deleteSection(target.id, options)
    else deleteLine(target.id, options)
  }

  const sections = sheet.data?.sections ?? []
  return (
    <div className="flex flex-col gap-5">
      <AccountingToolbar
        year={year}
        currentYear={currentYear}
        onYearChange={setYear}
        onNewSection={() => setCreating(true)}
        creating={creating}
      />

      {creating && (
        <NewSectionForm
          sections={sections}
          busy={createSection.isPending}
          onSubmit={submitSection}
          onCancel={() => setCreating(false)}
        />
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
      {sheet.data && sections.length === 0 && !creating && (
        <AccountingEmptyState onCreate={() => setCreating(true)} />
      )}
      {sections.length > 0 && (
        <SheetActionsProvider value={actions}>
          <AccountingSheet year={shownYear} sections={sections} addingLineTo={addingLineTo} />
        </SheetActionsProvider>
      )}

      <ConfirmDeleteDialog
        target={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
