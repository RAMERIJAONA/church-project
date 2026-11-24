import { createContext, useContext } from 'react'
import type {
  AccountingLineDTO,
  AccountingSectionDTO,
  MoveDirection
} from '@shared/domain/accounting/accounting.types'

/**
 * Actions du tableau, fournies par la page (container) et lues par les lignes.
 * Contexte local à la feature : évite de passer ces callbacks sur 3 niveaux (CLAUDE.md par. 5.2).
 * Aucune donnée chargée ici : uniquement des événements.
 */
export interface SheetActions {
  year: number
  renameSection: (id: number, description: string) => void
  moveSection: (id: number, direction: MoveDirection) => void
  askDeleteSection: (section: AccountingSectionDTO) => void
  renameLine: (id: number, description: string) => void
  moveLine: (id: number, direction: MoveDirection) => void
  askDeleteLine: (line: AccountingLineDTO) => void
  setAmount: (lineId: number, amount: number | null) => void
  /** Ouvre (id) ou ferme (null) le formulaire d'ajout de ligne d'une rubrique */
  openAddLine: (sectionId: number | null) => void
  addLine: (sectionId: number, description: string, amount: number | null) => Promise<void>
}

const SheetActionsContext = createContext<SheetActions | null>(null)

export const SheetActionsProvider = SheetActionsContext.Provider

export function useSheetActions(): SheetActions {
  const ctx = useContext(SheetActionsContext)
  if (!ctx) throw new Error('useSheetActions doit être utilisé dans <SheetActionsProvider>')
  return ctx
}
