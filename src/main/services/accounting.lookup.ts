import type { DbOrTx } from '@main/db/client'
import type { AccountingRepository, EntryRef } from '@main/repositories/accounting.repository'
import { buildSheet, findItem } from '@shared/domain/accounting/accounting.tree'
import {
  MIN_YEAR,
  type AccountingItemDTO,
  type AccountingSheetDTO,
  type Ledger
} from '@shared/domain/accounting/accounting.types'
import { AppError } from '@shared/domain/errors'

export interface AccountingLookup {
  structure: (tx: DbOrTx, ledger: Ledger) => AccountingSheetDTO
  structureOf: (tx: DbOrTx, id: number) => AccountingSheetDTO
  codeOf: (tx: DbOrTx, id: number) => string
  requireItem: (tx: DbOrTx, id: number) => AccountingItemDTO
  /** Élément qui peut porter des montants : sans enfant (à tous les niveaux) */
  requireAmountHolder: (tx: DbOrTx, id: number) => AccountingItemDTO
  requireEntry: (tx: DbOrTx, id: number) => EntryRef
}

/**
 * Lecture de l'arbre pour le service de comptabilité : arbre d'une comptabilité, rubrique et
 * saisie existantes (erreurs `NOT_FOUND` / `BUSINESS_RULE`). Sorti du service pour qu'il
 * reste lisible ; aucune écriture ici.
 */
export function createAccountingLookup(repo: AccountingRepository): AccountingLookup {
  /** Arbre d'une comptabilité sans montants : niveaux, numéros, enfants (reste petit). */
  function structure(tx: DbOrTx, ledger: Ledger): AccountingSheetDTO {
    return buildSheet(MIN_YEAR, repo.listItems(tx, ledger), [], repo.itemIdsWithEntries(tx), ledger)
  }

  /** Arbre de la comptabilité de l'élément `id` (vide si l'élément n'existe pas). */
  function structureOf(tx: DbOrTx, id: number): AccountingSheetDTO {
    const ledger = repo.findItemRow(tx, id)?.ledger
    return ledger ? structure(tx, ledger) : { year: MIN_YEAR, ledger: 'expense', items: [] }
  }

  const codeOf = (tx: DbOrTx, id: number): string => findItem(structureOf(tx, id), id)?.code ?? '?'

  function requireItem(tx: DbOrTx, id: number): AccountingItemDTO {
    const item = findItem(structureOf(tx, id), id)
    if (!item) throw new AppError('NOT_FOUND', 'Rubrique introuvable', { itemId: id })
    return item
  }

  /** Élément qui peut porter des montants : sans enfant (à tous les niveaux). */
  function requireAmountHolder(tx: DbOrTx, id: number): AccountingItemDTO {
    const item = requireItem(tx, id)
    if (item.children.length > 0) {
      throw new AppError(
        'BUSINESS_RULE',
        `${item.code} regroupe d’autres rubriques : saisissez les montants sur ses sous-rubriques.`,
        { itemId: id, code: item.code }
      )
    }
    return item
  }

  function requireEntry(tx: DbOrTx, id: number): EntryRef {
    const entry = repo.findEntry(tx, id)
    if (!entry) throw new AppError('NOT_FOUND', 'Saisie introuvable', { entryId: id })
    return entry
  }

  return { structure, structureOf, codeOf, requireItem, requireAmountHolder, requireEntry }
}
