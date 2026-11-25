import type {
  AccountingItemDTO,
  CellDTO,
  CreateItemInput,
  EntryDTO
} from '@shared/domain/accounting/accounting.types'

/**
 * Utilisables côté renderer comme côté main (aucune dépendance DB). Données fictives.
 * Niveau 1 : sans `prefix`, la lettre suivante est attribuée (une lettre par rubrique).
 */
export function makeRootInput(overrides: Partial<CreateItemInput> = {}): CreateItemInput {
  return { parentId: null, description: 'Rubrique', ...overrides }
}

export function makeChildInput(
  overrides: Partial<CreateItemInput> & { parentId: number }
): CreateItemInput {
  return { description: 'Sous-rubrique', ...overrides }
}

export function makeCellDTO(overrides: Partial<CellDTO> = {}): CellDTO {
  return { total: null, entryCount: 0, detailed: false, lastEntryAt: null, ...overrides }
}

/** Par défaut : feuille de niveau 2 « A1-I », montants vides. */
export function makeItemDTO(overrides: Partial<AccountingItemDTO> = {}): AccountingItemDTO {
  return {
    id: 2,
    code: 'A1-I',
    level: 2,
    prefix: null,
    description: 'Mpitandrina',
    amounts: { estimate: makeCellDTO(), actual: makeCellDTO(), nextEstimate: makeCellDTO() },
    canAddChild: true,
    children: [],
    ...overrides
  }
}

/** Niveau 1 « A1 ASA IOMBONANA », en groupe (sans montant) : passer `amounts` pour une feuille. */
export function makeRootDTO(overrides: Partial<AccountingItemDTO> = {}): AccountingItemDTO {
  return makeItemDTO({
    id: 1,
    code: 'A1',
    level: 1,
    prefix: 'A',
    description: 'ASA IOMBONANA',
    amounts: null,
    children: [],
    ...overrides
  })
}

export function makeEntryDTO(overrides: Partial<EntryDTO> = {}): EntryDTO {
  return {
    id: 1,
    amount: 250000,
    label: 'Kojakoja',
    operatedOn: '2026-11-24',
    createdAt: '2026-11-24T09:00:00.000Z',
    updatedAt: '2026-11-24T09:00:00.000Z',
    ...overrides
  }
}
