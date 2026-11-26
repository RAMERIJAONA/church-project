import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ExportSheetInput } from '@shared/domain/accounting/accounting.export'
import type {
  AccountingSheetDTO,
  AddEntryInput,
  CreateItemInput,
  EnteredTotalsInput,
  EntryType,
  Ledger,
  PeriodTotalsInput,
  UpdateEntryInput
} from '@shared/domain/accounting/accounting.types'
import { accountingApi } from './api'
import { columnTarget, withTotal, type AmountColumn } from './accounting.utils'

/** Query key factory : seule source des clés de cette feature. */
export const accountingKeys = {
  all: ['accounting'] as const,
  sheet: (ledger: Ledger, year: number) => [...accountingKeys.all, 'sheet', ledger, year] as const,
  entries: (itemId: number, year: number, type: EntryType) =>
    [...accountingKeys.all, 'entries', itemId, year, type] as const,
  periodTotals: (range: PeriodTotalsInput) =>
    [...accountingKeys.all, 'period', range.ledger, range.from, range.to] as const,
  enteredTotals: (input: EnteredTotalsInput) =>
    [...accountingKeys.all, 'entered', input.ledger, input.year, input.from, input.to] as const
}

export function useAccountingSheet(year: number, ledger: Ledger) {
  return useQuery({
    queryKey: accountingKeys.sheet(ledger, year),
    queryFn: () => accountingApi.sheet(year, ledger),
    // Changement d'année : l'ancien tableau reste affiché le temps du chargement (pas de saut)
    placeholderData: (previous) => previous
  })
}

/** Saisies d'une case, chargées seulement quand le détail est ouvert. */
export function useCellEntries(cell: { itemId: number; year: number; type: EntryType } | null) {
  return useQuery({
    queryKey: cell ? accountingKeys.entries(cell.itemId, cell.year, cell.type) : accountingKeys.all,
    queryFn: () => (cell ? accountingApi.entries(cell) : Promise.resolve([])),
    enabled: cell !== null
  })
}

/** Réalisations par élément sur une période ; l'ancienne période reste affichée au changement. */
export function usePeriodTotals(range: PeriodTotalsInput) {
  return useQuery({
    queryKey: accountingKeys.periodTotals(range),
    queryFn: () => accountingApi.periodTotals(range),
    placeholderData: (previous) => previous
  })
}

/** Synthèse : saisies faites pendant chaque période (jour, semaine, mois), par date de saisie. */
export function useEnteredTotalsMany(inputs: readonly EnteredTotalsInput[]) {
  return useQueries({
    queries: inputs.map((input) => ({
      queryKey: accountingKeys.enteredTotals(input),
      queryFn: () => accountingApi.enteredTotals(input)
    }))
  })
}

/** Toute écriture invalide la feature (requêtes locales, rapides). */
function useAccountingMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => qc.invalidateQueries({ queryKey: accountingKeys.all })
  })
}

export const useCreateItem = () =>
  useAccountingMutation((input: CreateItemInput) => accountingApi.createItem(input))
export const useUpdateItem = () =>
  useAccountingMutation((v: { id: number; description: string }) =>
    accountingApi.updateItem(v.id, v.description)
  )
export const useDeleteItem = () =>
  useAccountingMutation((id: number) => accountingApi.deleteItem(id))
export const useAddEntry = () =>
  useAccountingMutation((input: AddEntryInput) => accountingApi.addEntry(input))
export const useUpdateEntry = () =>
  useAccountingMutation((input: UpdateEntryInput) => accountingApi.updateEntry(input))
export const useDeleteEntry = () =>
  useAccountingMutation((id: number) => accountingApi.deleteEntry(id))

export interface SetTotalVars {
  /** Comptabilité et année affichées (clé du tableau à mettre à jour) */
  ledger: Ledger
  year: number
  itemId: number
  col: AmountColumn
  amount: number | null
}

/** Total direct : mise à jour optimiste (la case garde la valeur saisie), rollback si échec. */
export function useSetTotal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: SetTotalVars) =>
      accountingApi.setTotal({
        itemId: v.itemId,
        amount: v.amount,
        ...columnTarget(v.year, v.col)
      }),
    onMutate: async (v) => {
      const key = accountingKeys.sheet(v.ledger, v.year)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<AccountingSheetDTO>(key)
      if (previous) qc.setQueryData(key, withTotal(previous, v.itemId, v.col, v.amount))
      return { previous }
    },
    onError: (_err, v, context) => {
      if (context?.previous) {
        qc.setQueryData(accountingKeys.sheet(v.ledger, v.year), context.previous)
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: accountingKeys.all })
  })
}

/** Export Excel du tableau affiché (boîte « Enregistrer » côté main). Ne modifie rien. */
export function useExportExcel() {
  return useMutation({ mutationFn: (input: ExportSheetInput) => accountingApi.exportExcel(input) })
}
