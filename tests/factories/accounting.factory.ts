import type {
  AccountingLineDTO,
  AccountingSectionDTO,
  CreateLineInput,
  CreateSectionInput
} from '@shared/domain/accounting/accounting.types'

/** Utilisables côté renderer comme côté main (aucune dépendance DB). Données fictives. */
export function makeSectionInput(overrides: Partial<CreateSectionInput> = {}): CreateSectionInput {
  return { prefix: 'A', description: 'Rubrique', ...overrides }
}

export function makeLineInput(
  overrides: Partial<CreateLineInput> & Pick<CreateLineInput, 'sectionId'>
): CreateLineInput {
  return { description: 'Ligne', amount: null, year: 2026, ...overrides }
}

export function makeLineDTO(overrides: Partial<AccountingLineDTO> = {}): AccountingLineDTO {
  return { id: 1, code: 'A1-1', description: 'Kitapo iombonana', amount: 7654321, ...overrides }
}

export function makeSectionDTO(
  overrides: Partial<AccountingSectionDTO> = {}
): AccountingSectionDTO {
  return {
    id: 1,
    prefix: 'A',
    code: 'A1',
    description: 'ASA IOMBONANA',
    lines: [makeLineDTO()],
    ...overrides
  }
}
