import type { Clock } from '@main/adapters/clock.adapter'
import type { Db, DbOrTx } from '@main/db/client'
import type { Logger } from '@main/logging/logger'
import type { AccountingRepository } from '@main/repositories/accounting.repository'
import { availableLetters, childCode, rootCode } from '@shared/domain/accounting/accounting.codes'
import {
  isDetailed,
  normalizeDescription,
  normalizePrefix
} from '@shared/domain/accounting/accounting.rules'
import { buildSheet, countDescendants, findItem } from '@shared/domain/accounting/accounting.tree'
import {
  MAX_DEPTH,
  MIN_YEAR,
  type AccountingItemDTO,
  type AccountingSheetDTO,
  type AddEntryInput,
  type CreateItemInput,
  type CreatedEntryDTO,
  type CreatedItemDTO,
  type EntryDTO,
  type ListEntriesInput,
  type MoveDirection,
  type MoveResultDTO,
  type SetTotalInput,
  type UpdateEntryInput
} from '@shared/domain/accounting/accounting.types'
import { AppError } from '@shared/domain/errors'
import { formatAmount, MAX_AMOUNT } from '@shared/utils/money'

/** Cas d'usage de la comptabilité. Une méthode = une transaction. */
export function createAccountingService(deps: {
  db: Db
  accounting: AccountingRepository
  clock: Clock
  logger: Logger
}) {
  const repo = deps.accounting
  const now = (): string => deps.clock().toISOString()

  /** Arbre sans montants : niveaux, numéros, enfants (un plan comptable reste petit). */
  function structure(tx: DbOrTx): AccountingSheetDTO {
    return buildSheet(MIN_YEAR, repo.listItems(tx), [], repo.itemIdsWithEntries(tx))
  }

  function requireItem(tx: DbOrTx, id: number): AccountingItemDTO {
    const item = findItem(structure(tx), id)
    if (!item) throw new AppError('NOT_FOUND', 'Rubrique introuvable', { itemId: id })
    return item
  }

  /** Élément qui peut porter des montants : niveau ≥ 2 et sans enfant. */
  function requireAmountHolder(tx: DbOrTx, id: number): AccountingItemDTO {
    const item = requireItem(tx, id)
    if (item.level === 1 || item.children.length > 0) {
      throw new AppError(
        'BUSINESS_RULE',
        `${item.code} regroupe d’autres rubriques : saisissez les montants sur ses sous-rubriques.`,
        { itemId: id, code: item.code }
      )
    }
    return item
  }

  function requireEntry(tx: DbOrTx, id: number) {
    const entry = repo.findEntry(tx, id)
    if (!entry) throw new AppError('NOT_FOUND', 'Saisie introuvable', { entryId: id })
    return entry
  }

  function checkTotal(code: string, total: number): void {
    if (total > MAX_AMOUNT) {
      throw new AppError(
        'BUSINESS_RULE',
        `Le total de ${code} dépasserait ${formatAmount(MAX_AMOUNT)}.`,
        { code, total }
      )
    }
  }

  const sum = (entries: readonly EntryDTO[]): number => entries.reduce((n, x) => n + x.amount, 0)

  function createRoot(tx: DbOrTx, prefixInput: string, description: string): CreatedItemDTO {
    const prefix = normalizePrefix(prefixInput)
    const roots = structure(tx).items
    const allowed = availableLetters(roots.map((r) => r.prefix ?? ''))
    if (!allowed.includes(prefix)) {
      throw new AppError(
        'BUSINESS_RULE',
        `La lettre ${prefix} n’est pas disponible : choisissez ${allowed.join(', ')}.`,
        { prefix, allowed }
      )
    }
    const rank = roots.filter((r) => r.prefix === prefix).length + 1
    const id = repo.insertItem(tx, {
      parentId: null,
      prefix,
      position: repo.nextPosition(tx, { parentId: null, prefix }),
      description: normalizeDescription(1, description),
      at: now()
    })
    return { id, code: rootCode(prefix, rank) }
  }

  function createChild(tx: DbOrTx, parentId: number, description: string): CreatedItemDTO {
    const parent = requireItem(tx, parentId)
    if (parent.level >= MAX_DEPTH) {
      throw new AppError('BUSINESS_RULE', `${parent.code} est au dernier niveau (4).`, {
        parentId,
        code: parent.code
      })
    }
    if (!parent.canAddChild) {
      throw new AppError(
        'BUSINESS_RULE',
        `${parent.code} a déjà des montants : supprimez-les avant d’y ajouter une sous-rubrique.`,
        { parentId, code: parent.code }
      )
    }
    const level = (parent.level + 1) as 2 | 3 | 4
    const id = repo.insertItem(tx, {
      parentId,
      prefix: null,
      position: repo.nextPosition(tx, { parentId, prefix: null }),
      description: normalizeDescription(level, description),
      at: now()
    })
    return { id, code: childCode(parent.code, level, parent.children.length + 1) }
  }

  return {
    getSheet(year: number): AccountingSheetDTO {
      return deps.db.transaction((tx) =>
        buildSheet(
          year,
          repo.listItems(tx),
          repo.listEntriesForYears(tx, [year, year + 1]),
          repo.itemIdsWithEntries(tx)
        )
      )
    },

    createItem(input: CreateItemInput): CreatedItemDTO {
      return deps.db.transaction((tx) => {
        const created =
          input.parentId === null
            ? createRoot(tx, input.prefix ?? '', input.description)
            : createChild(tx, input.parentId, input.description)
        deps.logger.info({ itemId: created.id, code: created.code }, 'rubrique créée')
        return created
      })
    },

    updateItem(id: number, description: string): void {
      deps.db.transaction((tx) => {
        const item = requireItem(tx, id)
        repo.updateItem(
          tx,
          id,
          { description: normalizeDescription(item.level, description) },
          now()
        )
      })
    },

    deleteItem(id: number): void {
      deps.db.transaction((tx) => {
        const item = requireItem(tx, id)
        const deleted = repo.softDeleteSubtree(tx, id, now())
        deps.logger.info(
          { itemId: id, code: item.code, descendants: countDescendants(item), deleted },
          'rubrique supprimée'
        )
      })
    },

    moveItem(id: number, direction: MoveDirection): MoveResultDTO {
      return deps.db.transaction((tx) => {
        requireItem(tx, id)
        const row = repo.findItemRow(tx, id)
        if (!row) throw new AppError('NOT_FOUND', 'Rubrique introuvable', { itemId: id })
        const neighbor = repo.findAdjacentSibling(tx, row, direction)
        if (!neighbor) return { moved: false }
        const at = now()
        repo.updateItem(tx, row.id, { position: neighbor.position }, at)
        repo.updateItem(tx, neighbor.id, { position: row.position }, at)
        return { moved: true }
      })
    },

    /** Total direct d'une case simple. `amount: null` vide la case. */
    setTotal(input: SetTotalInput): void {
      deps.db.transaction((tx) => {
        const item = requireAmountHolder(tx, input.itemId)
        const entries = repo.listCellEntries(tx, input.itemId, input.year, input.type)
        if (isDetailed(entries)) {
          throw new AppError(
            'BUSINESS_RULE',
            `Ce montant de ${item.code} est détaillé : modifiez-le depuis le détail.`,
            { itemId: input.itemId, year: input.year, type: input.type }
          )
        }
        const existing = entries[0]
        const at = now()
        if (input.amount === null) {
          if (existing) repo.softDeleteEntry(tx, existing.id, at)
        } else if (existing) {
          repo.updateEntry(tx, existing.id, { amount: input.amount, label: null }, at)
        } else {
          repo.insertEntry(tx, { ...input, amount: input.amount, label: null, at })
        }
      })
    },

    listEntries(input: ListEntriesInput): EntryDTO[] {
      return deps.db.transaction((tx) => {
        requireItem(tx, input.itemId)
        return repo.listCellEntries(tx, input.itemId, input.year, input.type)
      })
    },

    addEntry(input: AddEntryInput): CreatedEntryDTO {
      return deps.db.transaction((tx) => {
        const item = requireAmountHolder(tx, input.itemId)
        const entries = repo.listCellEntries(tx, input.itemId, input.year, input.type)
        checkTotal(item.code, sum(entries) + input.amount)
        return { id: repo.insertEntry(tx, { ...input, at: now() }) }
      })
    },

    updateEntry(input: UpdateEntryInput): void {
      deps.db.transaction((tx) => {
        const entry = requireEntry(tx, input.id)
        const item = requireAmountHolder(tx, entry.itemId)
        const others = repo
          .listCellEntries(tx, entry.itemId, entry.year, entry.type)
          .filter((x) => x.id !== entry.id)
        checkTotal(item.code, sum(others) + input.amount)
        repo.updateEntry(tx, entry.id, { amount: input.amount, label: input.label }, now())
      })
    },

    deleteEntry(id: number): void {
      deps.db.transaction((tx) => {
        const entry = requireEntry(tx, id)
        requireItem(tx, entry.itemId)
        repo.softDeleteEntry(tx, id, now())
      })
    }
  }
}

export type AccountingService = ReturnType<typeof createAccountingService>
