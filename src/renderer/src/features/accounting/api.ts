import { invoke } from '@renderer/lib/ipc-client'
import type {
  AddEntryInput,
  CreateItemInput,
  ListEntriesInput,
  PeriodTotalsInput,
  MoveDirection,
  SetTotalInput,
  UpdateEntryInput
} from '@shared/domain/accounting/accounting.types'

export const accountingApi = {
  sheet: (year: number) => invoke('accounting.sheet', { year }),
  createItem: (input: CreateItemInput) => invoke('accounting.createItem', input),
  updateItem: (id: number, description: string) =>
    invoke('accounting.updateItem', { id, description }),
  deleteItem: (id: number) => invoke('accounting.deleteItem', { id }),
  moveItem: (id: number, direction: MoveDirection) =>
    invoke('accounting.moveItem', { id, direction }),
  setTotal: (input: SetTotalInput) => invoke('accounting.setTotal', input),
  entries: (input: ListEntriesInput) => invoke('accounting.entries', input),
  addEntry: (input: AddEntryInput) => invoke('accounting.addEntry', input),
  updateEntry: (input: UpdateEntryInput) => invoke('accounting.updateEntry', input),
  deleteEntry: (id: number) => invoke('accounting.deleteEntry', { id }),
  periodTotals: (range: PeriodTotalsInput) => invoke('accounting.periodTotals', range)
}
