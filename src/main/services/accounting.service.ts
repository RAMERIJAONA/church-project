import type { Clock } from '@main/adapters/clock.adapter'
import type { Db, DbOrTx } from '@main/db/client'
import type { Logger } from '@main/logging/logger'
import type { AccountingRepository } from '@main/repositories/accounting.repository'
import {
  availableLetters,
  buildSheet,
  lineCode,
  normalizePrefix,
  normalizeSectionDescription,
  sectionCode,
  type LineRow,
  type SectionRow
} from '@shared/domain/accounting/accounting.rules'
import type {
  AccountingSheetDTO,
  CreateLineInput,
  CreateSectionInput,
  CreatedItemDTO,
  MoveDirection,
  MoveResultDTO,
  SetAmountInput
} from '@shared/domain/accounting/accounting.types'
import { AppError } from '@shared/domain/errors'

/** Cas d'usage de la comptabilité. Une méthode = une transaction. */
export function createAccountingService(deps: {
  db: Db
  accounting: AccountingRepository
  clock: Clock
  logger: Logger
}) {
  const repo = deps.accounting
  const now = (): string => deps.clock().toISOString()

  function requireSection(tx: DbOrTx, id: number): SectionRow {
    const section = repo.findSection(tx, id)
    if (!section) throw new AppError('NOT_FOUND', 'Rubrique introuvable', { sectionId: id })
    return section
  }

  function requireLine(tx: DbOrTx, id: number): LineRow {
    const line = repo.findLine(tx, id)
    if (!line) throw new AppError('NOT_FOUND', 'Ligne introuvable', { lineId: id })
    return line
  }

  /** Code actuel d'une rubrique (pour les messages et les logs). */
  function codeOf(tx: DbOrTx, sectionId: number): string {
    const sheet = buildSheet(0, repo.listSections(tx), [], [])
    return sheet.sections.find((s) => s.id === sectionId)?.code ?? '?'
  }

  return {
    getSheet(year: number): AccountingSheetDTO {
      return deps.db.transaction((tx) =>
        buildSheet(year, repo.listSections(tx), repo.listLines(tx), repo.listAmounts(tx, year))
      )
    },

    createSection(input: CreateSectionInput): CreatedItemDTO {
      return deps.db.transaction((tx) => {
        const at = now()
        const prefix = normalizePrefix(input.prefix)
        // Lettre automatique : une lettre déjà utilisée, ou la suivante de l'alphabet malgache
        const allowed = availableLetters(repo.listSections(tx).map((s) => s.prefix))
        if (!allowed.includes(prefix)) {
          throw new AppError(
            'BUSINESS_RULE',
            `La lettre ${prefix} n’est pas disponible : choisissez ${allowed.join(', ')}.`,
            { prefix, allowed }
          )
        }
        // Nouvelle rubrique = dernière de sa lettre → son numéro = nombre de rubriques actives
        const rank = repo.countActiveSections(tx, prefix) + 1
        const id = repo.insertSection(tx, {
          prefix,
          position: repo.nextSectionPosition(tx, prefix),
          description: normalizeSectionDescription(input.description),
          at
        })
        const code = sectionCode(prefix, rank)
        deps.logger.info({ sectionId: id, code }, 'rubrique créée')
        return { id, code }
      })
    },

    updateSection(id: number, description: string): void {
      deps.db.transaction((tx) => {
        requireSection(tx, id)
        repo.updateSection(tx, id, { description: normalizeSectionDescription(description) }, now())
      })
    },

    deleteSection(id: number): void {
      deps.db.transaction((tx) => {
        requireSection(tx, id)
        const code = codeOf(tx, id)
        const lines = repo.softDeleteSection(tx, id, now())
        deps.logger.info({ sectionId: id, code, lines }, 'rubrique supprimée')
      })
    },

    moveSection(id: number, direction: MoveDirection): MoveResultDTO {
      return deps.db.transaction((tx) => {
        const section = requireSection(tx, id)
        const neighbor = repo.findAdjacentSection(tx, section, direction)
        if (!neighbor) return { moved: false }
        const at = now()
        repo.updateSection(tx, section.id, { position: neighbor.position }, at)
        repo.updateSection(tx, neighbor.id, { position: section.position }, at)
        return { moved: true }
      })
    },

    createLine(input: CreateLineInput): CreatedItemDTO {
      return deps.db.transaction((tx) => {
        requireSection(tx, input.sectionId)
        const at = now()
        const rank = repo.countActiveLines(tx, input.sectionId) + 1
        const id = repo.insertLine(tx, {
          sectionId: input.sectionId,
          position: repo.nextLinePosition(tx, input.sectionId),
          description: input.description,
          at
        })
        if (input.amount !== null) repo.upsertAmount(tx, id, input.year, input.amount, at)
        const code = lineCode(codeOf(tx, input.sectionId), rank)
        deps.logger.info({ lineId: id, code }, 'ligne créée')
        return { id, code }
      })
    },

    updateLine(id: number, description: string): void {
      deps.db.transaction((tx) => {
        requireLine(tx, id)
        repo.updateLine(tx, id, { description }, now())
      })
    },

    deleteLine(id: number): void {
      deps.db.transaction((tx) => {
        requireLine(tx, id)
        repo.softDeleteLine(tx, id, now())
        deps.logger.info({ lineId: id }, 'ligne supprimée')
      })
    },

    moveLine(id: number, direction: MoveDirection): MoveResultDTO {
      return deps.db.transaction((tx) => {
        const line = requireLine(tx, id)
        const neighbor = repo.findAdjacentLine(tx, line, direction)
        if (!neighbor) return { moved: false }
        const at = now()
        repo.updateLine(tx, line.id, { position: neighbor.position }, at)
        repo.updateLine(tx, neighbor.id, { position: line.position }, at)
        return { moved: true }
      })
    },

    /** `amount: null` efface le montant de l'année. */
    setAmount(input: SetAmountInput): void {
      deps.db.transaction((tx) => {
        requireLine(tx, input.lineId)
        if (input.amount === null) repo.deleteAmount(tx, input.lineId, input.year)
        else repo.upsertAmount(tx, input.lineId, input.year, input.amount, now())
      })
    }
  }
}

export type AccountingService = ReturnType<typeof createAccountingService>
