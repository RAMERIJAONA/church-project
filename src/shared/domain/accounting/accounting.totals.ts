/**
 * Sous-totaux et total général (fonction pure, partagée UI / main).
 * - rubrique qui porte des montants : sa propre valeur ;
 * - groupe : somme de toute sa descendance ;
 * - `null` quand aucune rubrique concernée n'a de montant (≠ 0, qui est un montant saisi).
 */
import type { AccountingItemDTO } from './accounting.types'

export interface RollUp {
  byItem: Map<number, number | null>
  /** Somme des rubriques principales */
  grand: number | null
}

const add = (a: number | null, b: number | null): number | null =>
  a === null ? b : b === null ? a : a + b

/** `valueOf` donne la valeur d'une rubrique qui porte des montants (ex. réalisation N). */
export function rollUp(
  items: readonly AccountingItemDTO[],
  valueOf: (item: AccountingItemDTO) => number | null
): RollUp {
  const byItem = new Map<number, number | null>()
  const visit = (item: AccountingItemDTO): number | null => {
    const value =
      item.children.length === 0
        ? valueOf(item)
        : item.children.reduce<number | null>((sum, c) => add(sum, visit(c)), null)
    byItem.set(item.id, value)
    return value
  }
  const grand = items.reduce<number | null>((sum, root) => add(sum, visit(root)), null)
  return { byItem, grand }
}
