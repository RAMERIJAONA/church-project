import type {
  AccountingItemDTO,
  CellDTO,
  CreateItemInput,
  EntryDTO
} from '@shared/domain/accounting/accounting.types'

/** Utilisables côté renderer comme côté main (aucune dépendance DB). Données fictives. */
export function makeRootInput(overrides: Partial<CreateItemInput> = {}): CreateItemInput {
  return { parentId: null, prefix: 'A', description: 'Rubrique', ...overrides }
}

export function makeChildInput(
  overrides: Partial<CreateItemInput> & { parentId: number }
): CreateItemInput {
  return { description: 'Sous-rubrique', ...overrides }
}

export function makeCellDTO(overrides: Partial<CellDTO> = {}): CellDTO {
  return { total: null, entryCount: 0, detailed: false, ...overrides }
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

/** Groupe de niveau 1 « A1 ASA IOMBONANA ». */
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
    createdAt: '2026-11-24T09:00:00.000Z',
    updatedAt: '2026-11-24T09:00:00.000Z',
    ...overrides
  }
}
