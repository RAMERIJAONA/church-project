import { invoke } from '@renderer/lib/ipc-client'
import type {
  CreateLineInput,
  CreateSectionInput,
  MoveDirection,
  SetAmountInput
} from '@shared/domain/accounting/accounting.types'

export const accountingApi = {
  sheet: (year: number) => invoke('accounting.sheet', { year }),
  createSection: (input: CreateSectionInput) => invoke('accounting.createSection', input),
  updateSection: (id: number, description: string) =>
    invoke('accounting.updateSection', { id, description }),
  deleteSection: (id: number) => invoke('accounting.deleteSection', { id }),
  moveSection: (id: number, direction: MoveDirection) =>
    invoke('accounting.moveSection', { id, direction }),
  createLine: (input: CreateLineInput) => invoke('accounting.createLine', input),
  updateLine: (id: number, description: string) =>
    invoke('accounting.updateLine', { id, description }),
  deleteLine: (id: number) => invoke('accounting.deleteLine', { id }),
  moveLine: (id: number, direction: MoveDirection) =>
    invoke('accounting.moveLine', { id, direction }),
  setAmount: (input: SetAmountInput) => invoke('accounting.setAmount', input)
}
