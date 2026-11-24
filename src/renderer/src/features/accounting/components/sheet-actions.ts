import { createContext, useContext } from 'react'
import type { AccountingItemDTO, MoveDirection } from '@shared/domain/accounting/accounting.types'
import type { AmountColumn } from '../accounting.utils'

/**
 * Actions du tableau, fournies par la page (container) et lues par les rangées.
 * Contexte local à la feature : évite de passer ces callbacks sur 3 niveaux (CLAUDE.md par. 5.2).
 * Aucune donnée chargée ici : uniquement des événements.
 */
export interface SheetActions {
  /** Année affichée N (colonnes Estimation N, Réalisation N, Estimation N+1) */
  year: number
  rename: (id: number, description: string) => void
  move: (id: number, direction: MoveDirection) => void
  askDelete: (item: AccountingItemDTO) => void
  /** Total direct d'une case simple (`null` : vider) */
  setTotal: (itemId: number, col: AmountColumn, amount: number | null) => void
  openDetail: (item: AccountingItemDTO, col: AmountColumn) => void
  /** Ouvre (id du parent) ou ferme (null) le formulaire d'ajout de sous-rubrique */
  openAddChild: (parentId: number | null) => void
  addChild: (parentId: number, description: string) => Promise<void>
}

const SheetActionsContext = createContext<SheetActions | null>(null)

export const SheetActionsProvider = SheetActionsContext.Provider

export function useSheetActions(): SheetActions {
  const ctx = useContext(SheetActionsContext)
  if (!ctx) throw new Error('useSheetActions doit être utilisé dans <SheetActionsProvider>')
  return ctx
}
