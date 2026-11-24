import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AccountingItemDTO } from '@shared/domain/accounting/accounting.types'
import { formatAmount } from '@shared/utils/money'
import { makeCellDTO, makeItemDTO, makeRootDTO } from '@tests/factories/accounting.factory'
import { AccountingSheet } from './AccountingSheet'
import { SheetActionsProvider, type SheetActions } from './sheet-actions'

function makeActions(overrides: Partial<SheetActions> = {}): SheetActions {
  return {
    year: 2026,
    rename: vi.fn(),
    move: vi.fn(),
    askDelete: vi.fn(),
    setTotal: vi.fn(),
    openDetail: vi.fn(),
    openAddChild: vi.fn(),
    addChild: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

/** F1 > {F1-I > F1-I-1, F1-II > F1-II-1 > {A), B)}} */
function church(): AccountingItemDTO[] {
  const a = makeItemDTO({ id: 6, code: 'F1-II-1 A)', level: 4, canAddChild: false })
  const b = makeItemDTO({ id: 7, code: 'F1-II-1 B)', level: 4, canAddChild: false })
  const ii1 = makeItemDTO({ id: 5, code: 'F1-II-1', level: 3, amounts: null, children: [a, b] })
  const ii = makeItemDTO({ id: 4, code: 'F1-II', amounts: null, children: [ii1] })
  const i1 = makeItemDTO({ id: 3, code: 'F1-I-1', level: 3, canAddChild: false })
  const i = makeItemDTO({ id: 2, code: 'F1-I', amounts: null, children: [i1] })
  return [makeRootDTO({ id: 1, code: 'F1', prefix: 'F', children: [i, ii] })]
}

const shown = (text: string): string => text.replace(/\s/g, ' ')
const rowText = (code: string): string =>
  shown(screen.getByRole('rowheader', { name: code }).closest('tr')?.textContent ?? '')

/** Réalisation 2026 sur 3 feuilles : F1-I-1 420 000, A) 250 000, B) 100 000 ; Estimation sur F1-I-1 */
function withAmounts(items: AccountingItemDTO[]): AccountingItemDTO[] {
  const actual: Record<number, number> = { 3: 420000, 6: 250000, 7: 100000 }
  const fill = (item: AccountingItemDTO): AccountingItemDTO => ({
    ...item,
    amounts: item.amounts && {
      ...item.amounts,
      actual: makeCellDTO({ total: actual[item.id] ?? null }),
      estimate: makeCellDTO({ total: item.id === 3 ? 500000 : null })
    },
    children: item.children.map(fill)
  })
  return items.map(fill)
}

function renderSheet(
  {
    year = 2026,
    addingChildTo = null,
    items = church()
  }: { year?: number; addingChildTo?: number | null; items?: AccountingItemDTO[] } = {},
  actions = makeActions({ year })
) {
  render(
    <SheetActionsProvider value={actions}>
      <AccountingSheet year={year} items={items} addingChildTo={addingChildTo} />
    </SheetActionsProvider>
  )
  return actions
}

describe('AccountingSheet', () => {
  it('affiche l’arbre indenté avec les numéros', () => {
    renderSheet()
    expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual([
      'F1',
      'F1-I',
      'F1-I-1',
      'F1-II',
      'F1-II-1',
      'F1-II-1 A)',
      'F1-II-1 B)',
      'Total général'
    ])
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'N°',
      'Description',
      'Estimation 2026',
      'Réalisation 2026',
      'Estimation 2027',
      'Actions'
    ])
  })

  it('n’affiche pas de case de montant pour un groupe ni au niveau 1', () => {
    renderSheet()
    for (const code of ['F1', 'F1-I', 'F1-II-1']) {
      expect(screen.queryByRole('textbox', { name: `Réalisation 2026 de ${code}` })).toBeNull()
    }
    for (const code of ['F1-I-1', 'F1-II-1 A)']) {
      expect(screen.getByRole('textbox', { name: `Réalisation 2026 de ${code}` })).toBeDefined()
    }
  })

  it('transmet la colonne saisie (Estimation N+1)', async () => {
    const actions = renderSheet()
    const input = screen.getByRole('textbox', { name: 'Estimation 2027 de F1-I-1' })
    await userEvent.click(input)
    await userEvent.keyboard('600000{Enter}')
    expect(actions.setTotal).toHaveBeenCalledWith(3, 'nextEstimate', 600000)
  })

  it('désactive l’ajout de sous-rubrique sur une feuille qui a des saisies', () => {
    renderSheet()
    const add = (code: string) =>
      screen.getByRole('button', { name: `Ajouter une sous-rubrique à ${code}` })
    expect(add('F1-I-1')).toHaveProperty('disabled', true)
    expect(add('F1-II-1 A)')).toHaveProperty('disabled', true)
    expect(add('F1-I')).toHaveProperty('disabled', false)
  })

  it('désactive Estimation N+1 en 2200', () => {
    renderSheet({ year: 2200 })
    expect(screen.getByRole('textbox', { name: 'Estimation 2201 de F1-I-1' })).toHaveProperty(
      'disabled',
      true
    )
    expect(screen.getByRole('textbox', { name: 'Réalisation 2200 de F1-I-1' })).toHaveProperty(
      'disabled',
      false
    )
  })

  it('ouvre l’ajout sous le dernier descendant et crée la sous-rubrique', async () => {
    const actions = renderSheet({ addingChildTo: 1 })
    const input = screen.getByRole('textbox', {
      name: 'Description de la nouvelle sous-rubrique F1-III'
    })
    const rows = screen.getAllByRole('row')
    expect(rows.at(-2)?.contains(input)).toBe(true) // après F1-II-1 B), avant le total
    await userEvent.type(input, 'Fanampiana{Enter}')
    expect(actions.addChild).toHaveBeenCalledWith(1, 'Fanampiana')
  })

  it('demande la suppression de l’élément', async () => {
    const actions = renderSheet()
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer F1-II' }))
    expect(actions.askDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }))
  })

  it('affiche le sous-total de chaque groupe et le total général, par colonne', () => {
    renderSheet({ items: withAmounts(church()) })
    const amount = (n: number): string => shown(formatAmount(n))
    expect(rowText('F1-II-1')).toContain(amount(350000))
    expect(rowText('F1-I')).toContain(amount(420000))
    expect(rowText('F1')).toContain(amount(770000))
    expect(rowText('F1')).toContain(amount(500000))
    const total = rowText('Total général')
    expect(total).toContain(amount(500000))
    expect(total).toContain(amount(770000))
    // Les sous-totaux ne sont pas modifiables
    expect(screen.queryByRole('textbox', { name: 'Réalisation 2026 de F1' })).toBeNull()
  })
})
