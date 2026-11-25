import type { Clock } from '@main/adapters/clock.adapter'
import type { Db, DbOrTx } from '@main/db/client'
import type { Logger } from '@main/logging/logger'
import type { AccountingRepository } from '@main/repositories/accounting.repository'
import { availableLetters } from '@shared/domain/accounting/accounting.codes'
import {
  isDetailed,
  newEntryOperationDate,
  normalizeDescription,
  normalizePrefix,
  operationDateError
} from '@shared/domain/accounting/accounting.rules'
import { buildSheet, countDescendants } from '@shared/domain/accounting/accounting.tree'
import {
  MAX_DEPTH,
  type AccountingSheetDTO,
  type AddEntryInput,
  type CreateItemInput,
  type CreatedEntryDTO,
  type CreatedItemDTO,
  type EntryDTO,
  type EntryType,
  type Ledger,
  type PeriodTotalDTO,
  type PeriodTotalsInput,
  type ListEntriesInput,
  type MoveDirection,
  type MoveResultDTO,
  type SetTotalInput,
  type UpdateEntryInput
} from '@shared/domain/accounting/accounting.types'
import { AppError } from '@shared/domain/errors'
import { formatAmount, MAX_AMOUNT } from '@shared/utils/money'
import { createAccountingLookup } from './accounting.lookup'

/** Cas d'usage de la comptabilité. Une méthode = une transaction. */
export function createAccountingService(deps: {
  db: Db
  accounting: AccountingRepository
  clock: Clock
  logger: Logger
}) {
  const repo = deps.accounting
  const now = (): string => deps.clock().toISOString()

  const { structure, codeOf, requireItem, requireAmountHolder, requireEntry } =
    createAccountingLookup(repo)

  function checkTotal(code: string, total: number): void {
    if (total > MAX_AMOUNT) {
      throw new AppError(
        'BUSINESS_RULE',
        `Le total de ${code} dépasserait ${formatAmount(MAX_AMOUNT)}.`,
        { code, total }
      )
    }
  }

  function checkOperationDate(type: EntryType, year: number, operatedOn: string | null): void {
    const message = operationDateError(type, year, operatedOn)
    if (message) throw new AppError('VALIDATION', message, { type, year, operatedOn })
  }

  const sum = (entries: readonly EntryDTO[]): number => entries.reduce((n, x) => n + x.amount, 0)

  function createRoot(
    tx: DbOrTx,
    ledger: Ledger,
    prefixInput: string,
    description: string
  ): CreatedItemDTO {
    const prefix = normalizePrefix(prefixInput)
    const roots = structure(tx, ledger).items
    const allowed = availableLetters(roots.map((r) => r.prefix ?? ''))
    if (!allowed.includes(prefix)) {
      throw new AppError(
        'BUSINESS_RULE',
        `La lettre ${prefix} n’est pas disponible : choisissez ${allowed.join(', ')}.`,
        { prefix, allowed }
      )
    }
    const id = repo.insertItem(tx, {
      parentId: null,
      prefix,
      ledger,
      position: repo.nextPosition(tx, { parentId: null, prefix, ledger }),
      description: normalizeDescription(1, description),
      at: now()
    })
    return { id, code: codeOf(tx, id) }
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
    // La sous-rubrique hérite de la comptabilité de son parent
    const ledger = repo.findItemRow(tx, parentId)?.ledger ?? 'expense'
    const id = repo.insertItem(tx, {
      parentId,
      prefix: null,
      ledger,
      position: repo.nextPosition(tx, { parentId, prefix: null, ledger }),
      description: normalizeDescription(level, description),
      at: now()
    })
    // Relu après l'insertion : le parent peut changer de numéro en devenant un groupe
    return { id, code: codeOf(tx, id) }
  }

  return {
    /** Tableau d'une comptabilité (sorties par défaut : tests et anciens appels). */
    getSheet(year: number, ledger: Ledger = 'expense'): AccountingSheetDTO {
      return deps.db.transaction((tx) =>
        buildSheet(
          year,
          repo.listItems(tx, ledger),
          repo.listEntriesForYears(tx, [year, year + 1]),
          repo.itemIdsWithEntries(tx),
          ledger
        )
      )
    },

    createItem(input: CreateItemInput): CreatedItemDTO {
      return deps.db.transaction((tx) => {
        const created =
          input.parentId === null
            ? createRoot(tx, input.ledger ?? 'expense', input.prefix ?? '', input.description)
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
          // La date d'opération d'un total existant est conservée
          repo.updateEntry(tx, existing.id, { amount: input.amount, label: null }, at)
        } else {
          const operatedOn = newEntryOperationDate(input.type, input.year, deps.clock())
          repo.insertEntry(tx, { ...input, amount: input.amount, label: null, operatedOn, at })
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
        const { type, year } = input
        const operatedOn = newEntryOperationDate(type, year, deps.clock(), input.operatedOn)
        checkOperationDate(type, year, operatedOn)
        const entries = repo.listCellEntries(tx, input.itemId, input.year, input.type)
        checkTotal(item.code, sum(entries) + input.amount)
        return { id: repo.insertEntry(tx, { ...input, operatedOn, at: now() }) }
      })
    },

    updateEntry(input: UpdateEntryInput): void {
      deps.db.transaction((tx) => {
        const entry = requireEntry(tx, input.id)
        const item = requireAmountHolder(tx, entry.itemId)
        // Date absente (UI) : la date d'opération de la saisie est conservée
        const operatedOn = input.operatedOn !== undefined ? input.operatedOn : entry.operatedOn
        checkOperationDate(entry.type, entry.year, operatedOn)
        const others = repo
          .listCellEntries(tx, entry.itemId, entry.year, entry.type)
          .filter((x) => x.id !== entry.id)
        checkTotal(item.code, sum(others) + input.amount)
        const { amount, label } = input
        repo.updateEntry(tx, entry.id, { amount, label, operatedOn }, now())
      })
    },

    /** Réalisations par élément sur une période (date d'opération, bornes incluses). */
    getPeriodTotals(range: PeriodTotalsInput): PeriodTotalDTO[] {
      return deps.db.transaction((tx) =>
        repo.sumActualBetween(tx, range.ledger, range.from, range.to)
      )
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
