import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeLineDTO, makeSectionDTO } from '@tests/factories/accounting.factory'
import { AccountingSheet } from './AccountingSheet'
import { SheetActionsProvider, type SheetActions } from './sheet-actions'

function makeActions(overrides: Partial<SheetActions> = {}): SheetActions {
  return {
    year: 2026,
    renameSection: vi.fn(),
    moveSection: vi.fn(),
    askDeleteSection: vi.fn(),
    renameLine: vi.fn(),
    moveLine: vi.fn(),
    askDeleteLine: vi.fn(),
    setAmount: vi.fn(),
    openAddLine: vi.fn(),
    addLine: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

const section = makeSectionDTO({
  lines: [
    makeLineDTO({ id: 1, code: 'A1-1', description: 'Kitapo iombonana', amount: 7654321 }),
    makeLineDTO({ id: 2, code: 'A1-2', description: 'KTM - Adidy', amount: null })
  ]
})

function renderSheet(actions = makeActions(), addingLineTo: number | null = null) {
  render(
    <SheetActionsProvider value={actions}>
      <AccountingSheet year={2026} sections={[section]} addingLineTo={addingLineTo} />
    </SheetActionsProvider>
  )
  return actions
}

describe('AccountingSheet', () => {
  it('affiche l’année en en-tête, la rubrique sans montant et ses lignes numérotées', () => {
    renderSheet()
    expect(screen.getByRole('columnheader', { name: 'Montant 2026' })).toBeTruthy()
    const sectionRow = screen.getByRole('rowheader', { name: 'A1' }).closest('tr')!
    expect(within(sectionRow).queryByRole('textbox')).toBeNull()
    expect(screen.getByRole('rowheader', { name: 'A1-1' })).toBeTruthy()
    expect(screen.getByRole('rowheader', { name: 'A1-2' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Montant 2026 de A1-2' })).toHaveProperty(
      'value',
      ''
    )
  })

  it('désactive « Monter » sur la première ligne et « Descendre » sur la dernière', () => {
    renderSheet()
    expect(screen.getByRole('button', { name: 'Monter A1-1' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Descendre A1-2' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Descendre A1-1' })).toHaveProperty('disabled', false)
  })

  it('modifie une description en place', async () => {
    const actions = renderSheet()
    await userEvent.click(screen.getByRole('button', { name: 'KTM - Adidy' }))
    const field = screen.getByRole('textbox', { name: 'Description de A1-2' })
    await userEvent.clear(field)
    await userEvent.type(field, 'KTM - Adidy 2{Enter}')
    expect(actions.renameLine).toHaveBeenCalledWith(2, 'KTM - Adidy 2')
    expect(screen.queryByRole('textbox', { name: 'Description de A1-2' })).toBeNull()
  })

  it('renomme une rubrique en majuscules, même saisie en minuscules', async () => {
    const actions = renderSheet()
    await userEvent.click(screen.getByRole('button', { name: 'Modifier A1' }))
    const field = screen.getByRole('textbox', { name: 'Description de A1' })
    await userEvent.clear(field)
    await userEvent.type(field, 'asa iombonana vaovao{Enter}')
    expect(actions.renameSection).toHaveBeenCalledWith(section.id, 'ASA IOMBONANA VAOVAO')
  })

  it('ajoute une ligne avec son montant, numéro suivant annoncé, puis reste prêt', async () => {
    const actions = renderSheet(makeActions(), section.id)
    expect(screen.getByText('A1-3')).toBeTruthy()
    const description = screen.getByRole('textbox', {
      name: 'Description de la nouvelle ligne A1-3'
    })
    await userEvent.type(description, 'Radio fahazavana{Enter}')
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Montant 2026 de la nouvelle ligne A1-3' }),
      '150 000{Enter}'
    )
    expect(actions.addLine).toHaveBeenCalledWith(section.id, 'Radio fahazavana', 150000)
    expect(description).toHaveProperty('value', '')
    expect(document.activeElement).toBe(description)
  })

  it('demande confirmation avant de supprimer', async () => {
    const actions = renderSheet()
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer A1' }))
    expect(actions.askDeleteSection).toHaveBeenCalledWith(section)
  })
})
