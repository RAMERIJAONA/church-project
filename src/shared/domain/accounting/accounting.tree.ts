/**
 * Construction du tableau d'une année à partir des lignes de la base. Fonction pure : aucun
 * accès DB ni horloge. Les numéros découlent de l'ordre (`position`) des éléments actifs :
 * - pas de trou après une suppression ;
 * - déplacer un élément renumérote ses frères ;
 * - les montants suivent l'élément (liés à son identifiant, pas à son numéro).
 */
import { childCode, comparePrefixes, level2Numeral, rootCode } from './accounting.codes'
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
    const siblings =
      childLevel > MAX_DEPTH ? [] : [...(childrenOf.get(row.id) ?? [])].sort(byPosition)
    // Une seule suite entre sœurs ; au niveau 2, en romains dès qu'une sœur est un groupe
    const numeral = level2Numeral(childLevel === 2 && siblings.some((c) => isGroup(c, 2)))
    const lvl = childLevel as 2 | 3 | 4
    const children = siblings.map((c, i) => toDTO(c, lvl, childCode(code, lvl, i + 1, numeral)))
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

  // Une lettre par rubrique principale (index unique en base) : le chiffre ne dépend que de la
  // comptabilité, jamais du rang
  const sortedRoots = [...roots].sort(
    (a, b) => comparePrefixes(a.prefix ?? '', b.prefix ?? '') || byPosition(a, b)
  )
  return {
    year,
    ledger,
    items: sortedRoots.map((r) => toDTO(r, 1, rootCode(r.prefix ?? '', ledger)))
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
