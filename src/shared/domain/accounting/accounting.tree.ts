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
  type ItemLevel,
  type Ledger
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
  /** ISO 8601 UTC */
  updatedAt: string
}

const byPosition = (a: ItemRow, b: ItemRow): number => a.position - b.position || a.id - b.id

/**
 * @param entries saisies actives des années `year` et `year + 1`
 * @param itemsWithEntries éléments ayant au moins une saisie active, toutes années confondues
 *   (un tel élément ne peut pas recevoir d'enfant)
 *
 * @param ledger comptabilité des éléments `items` (déjà filtrés) : premier numéro du niveau 1
 *
 * Éléments ignorés : parent absent (supprimé) et profondeur > 4.
 */
export function buildSheet(
  year: number,
  items: readonly ItemRow[],
  entries: readonly EntryRow[],
  itemsWithEntries: ReadonlySet<number>,
  ledger: Ledger = 'expense'
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

  const isGroup = (row: ItemRow, level: ItemLevel): boolean =>
    level < MAX_DEPTH && (childrenOf.get(row.id)?.length ?? 0) > 0

  const toDTO = (row: ItemRow, level: ItemLevel, code: string): AccountingItemDTO => {
    const childLevel = level + 1
    // Rangs : au niveau 2, groupes et rubriques à montant sont comptés séparément
    const ranks = { group: 0, leaf: 0 }
    const children =
      childLevel > MAX_DEPTH
        ? []
        : [...(childrenOf.get(row.id) ?? [])].sort(byPosition).map((c) => {
            const lvl = childLevel as 2 | 3 | 4
            const kind = isGroup(c, lvl) ? 'group' : 'leaf'
            const counter = lvl === 2 ? kind : 'leaf'
            ranks[counter] += 1
            return toDTO(c, lvl, childCode(code, lvl, ranks[counter], kind))
          })
    return {
      id: row.id,
      code,
      level,
      prefix: level === 1 ? row.prefix : null,
      description: row.description,
      amounts: children.length > 0 ? null : amountsOf(row.id),
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
    ledger,
    items: sortedRoots.map((r) => {
      const prefix = r.prefix ?? ''
      const rank = (rankByPrefix.get(prefix) ?? 0) + 1
      rankByPrefix.set(prefix, rank)
      return toDTO(r, 1, rootCode(prefix, rank, ledger))
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

/** Lignes équivalentes au tableau (positions = ordre affiché), pour simuler un ajout. */
function rowsOf(sheet: AccountingSheetDTO): ItemRow[] {
  const rows: ItemRow[] = []
  const walk = (items: readonly AccountingItemDTO[], parentId: number | null): void =>
    items.forEach((item, i) => {
      rows.push({ id: item.id, parentId, prefix: item.prefix, position: i + 1, description: '' })
      walk(item.children, item.id)
    })
  walk(sheet.items, null)
  return rows
}

/**
 * Numéro qu'aura une nouvelle sous-rubrique ajoutée à la fin de `parentId` (aperçu avant
 * création). Tient compte de la renumérotation du parent s'il devient un groupe.
 */
export function nextChildCode(sheet: AccountingSheetDTO, parentId: number): string | null {
  const probe = Number.MAX_SAFE_INTEGER
  const rows = rowsOf(sheet)
  rows.push({
    id: probe,
    parentId,
    prefix: null,
    position: Number.MAX_SAFE_INTEGER,
    description: ''
  })
  return findItem(buildSheet(sheet.year, rows, [], new Set(), sheet.ledger), probe)?.code ?? null
}
