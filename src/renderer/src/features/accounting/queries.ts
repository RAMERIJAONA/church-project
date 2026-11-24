import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AccountingSheetDTO,
  CreateLineInput,
  CreateSectionInput,
  MoveDirection,
  SetAmountInput
} from '@shared/domain/accounting/accounting.types'
import { accountingApi } from './api'

/** Query key factory : seule source des clés de cette feature. */
export const accountingKeys = {
  all: ['accounting'] as const,
  sheet: (year: number) => [...accountingKeys.all, 'sheet', year] as const
}

export function useAccountingSheet(year: number) {
  return useQuery({
    queryKey: accountingKeys.sheet(year),
    queryFn: () => accountingApi.sheet(year),
    // Changement d'année : l'ancien tableau reste affiché le temps du chargement (pas de saut)
    placeholderData: (previous) => previous
  })
}

/** Toute écriture invalide le tableau (une seule requête locale, rapide). */
function useAccountingMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => qc.invalidateQueries({ queryKey: accountingKeys.all })
  })
}

export const useCreateSection = () =>
  useAccountingMutation((input: CreateSectionInput) => accountingApi.createSection(input))
export const useUpdateSection = () =>
  useAccountingMutation((v: { id: number; description: string }) =>
    accountingApi.updateSection(v.id, v.description)
  )
export const useDeleteSection = () =>
  useAccountingMutation((id: number) => accountingApi.deleteSection(id))
export const useMoveSection = () =>
  useAccountingMutation((v: { id: number; direction: MoveDirection }) =>
    accountingApi.moveSection(v.id, v.direction)
  )
export const useCreateLine = () =>
  useAccountingMutation((input: CreateLineInput) => accountingApi.createLine(input))
export const useUpdateLine = () =>
  useAccountingMutation((v: { id: number; description: string }) =>
    accountingApi.updateLine(v.id, v.description)
  )
export const useDeleteLine = () =>
  useAccountingMutation((id: number) => accountingApi.deleteLine(id))
export const useMoveLine = () =>
  useAccountingMutation((v: { id: number; direction: MoveDirection }) =>
    accountingApi.moveLine(v.id, v.direction)
  )

/** Montant : mise à jour optimiste (la case garde la valeur saisie), rollback si échec. */
export function useSetAmount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SetAmountInput) => accountingApi.setAmount(input),
    onMutate: async (input) => {
      const key = accountingKeys.sheet(input.year)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<AccountingSheetDTO>(key)
      if (previous) qc.setQueryData(key, withAmount(previous, input))
      return { previous }
    },
    onError: (_err, input, context) => {
      if (context?.previous) qc.setQueryData(accountingKeys.sheet(input.year), context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: accountingKeys.all })
  })
}

function withAmount(sheet: AccountingSheetDTO, input: SetAmountInput): AccountingSheetDTO {
  return {
    ...sheet,
    sections: sheet.sections.map((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.id === input.lineId ? { ...l, amount: input.amount } : l))
    }))
  }
}
