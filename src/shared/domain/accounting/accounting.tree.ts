/**
 * Construction du tableau d'une année à partir des lignes de la base. Fonction pure : aucun
 * accès DB ni horloge. Les numéros découlent de l'ordre (`position`) des éléments actifs :
 * - pas de trou après une suppression ;
 * - déplacer un élément renumérote ses frères ;
 * - les montants suivent l'élément (liés à son identifiant, pas à son numéro).
 */
import { childCode, comparePrefixes, rootCode } from './accounting.codes'
import { cellOf } from './accounting.rules'
import {
  MAX_DEPTH,
  type AccountingItemDTO,
  type AccountingSheetDTO,
  type EntryType,
  type ItemAmountsDTO,
  type ItemLevel
} from './accounting.types'

export interface ItemRow {
  id: number
  parentId: number | null
  prefix: string | null
  position: number
  description: string
}

export interface EntryRow {
  itemId: number
  year: number
  type: EntryType
  amount: number
  label: string | null
}

const byPosition = (a: ItemRow, b: ItemRow): number => a.position - b.position || a.id - b.id

/**
 * @param entries saisies actives des années `year` et `year + 1`
 * @param itemsWithEntries éléments ayant au moins une saisie active, toutes années confondues
 *   (un tel élément ne peut pas recevoir d'enfant)
 *
 * Éléments ignorés : parent absent (supprimé) et profondeur > 4.
 */
export function buildSheet(
  year: number,
  items: readonly ItemRow[],
  entries: readonly EntryRow[],
  itemsWithEntries: ReadonlySet<number>
): AccountingSheetDTO {
  const childrenOf = new Map<number, ItemRow[]>()
  const roots: ItemRow[] = []
  for (const item of items) {
    if (item.parentId === null) {
      roots.push(item)
      continue
    }
    const list = childrenOf.get(item.parentId)
    if (list) list.push(item)
    else childrenOf.set(item.parentId, [item])
  }

  const entriesOf = new Map<number, EntryRow[]>()
  for (const e of entries) {
    const list = entriesOf.get(e.itemId)
    if (list) list.push(e)
    else entriesOf.set(e.itemId, [e])
  }

  const amountsOf = (id: number): ItemAmountsDTO => {
    const own = entriesOf.get(id) ?? []
    const pick = (y: number, type: EntryType): EntryRow[] =>
      own.filter((e) => e.year === y && e.type === type)
    return {
      estimate: cellOf(pick(year, 'estimate')),
      actual: cellOf(pick(year, 'actual')),
      nextEstimate: cellOf(pick(year + 1, 'estimate'))
    }
  }

  const toDTO = (row: ItemRow, level: ItemLevel, code: string): AccountingItemDTO => {
    const childLevel = level + 1
    const children =
      childLevel > MAX_DEPTH
        ? []
        : [...(childrenOf.get(row.id) ?? [])]
            .sort(byPosition)
            .map((c, i) =>
              toDTO(c, childLevel as ItemLevel, childCode(code, childLevel as 2 | 3 | 4, i + 1))
            )
    return {
      id: row.id,
      code,
      level,
      prefix: level === 1 ? row.prefix : null,
      description: row.description,
      amounts: level === 1 || children.length > 0 ? null : amountsOf(row.id),
      canAddChild: level < MAX_DEPTH && !itemsWithEntries.has(row.id),
      children
    }
  }

  const rankByPrefix = new Map<string, number>()
  const sortedRoots = [...roots].sort(
    (a, b) => comparePrefixes(a.prefix ?? '', b.prefix ?? '') || byPosition(a, b)
  )
  return {
    year,
    items: sortedRoots.map((r) => {
      const prefix = r.prefix ?? ''
      const rank = (rankByPrefix.get(prefix) ?? 0) + 1
      rankByPrefix.set(prefix, rank)
      return toDTO(r, 1, rootCode(prefix, rank))
    })
  }
}

/** Recherche en profondeur d'un élément du tableau. */
export function findItem(sheet: AccountingSheetDTO, id: number): AccountingItemDTO | undefined {
  const walk = (items: readonly AccountingItemDTO[]): AccountingItemDTO | undefined => {
    for (const item of items) {
      if (item.id === id) return item
      const found = walk(item.children)
      if (found) return found
    }
    return undefined
  }
  return walk(sheet.items)
}

/** Nombre d'éléments sous `item` (enfants, petits-enfants…). */
export function countDescendants(item: AccountingItemDTO): number {
  return item.children.reduce((n, c) => n + 1 + countDescendants(c), 0)
}
