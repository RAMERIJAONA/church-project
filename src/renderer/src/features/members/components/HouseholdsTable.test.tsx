import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { HouseholdSummaryDTO } from '@shared/domain/members/households.types'
import { HouseholdsTable } from './HouseholdsTable'

const sector = { id: 1, number: 1, name: 'Ambodimanga', numeral: 'I' }
const households: HouseholdSummaryDTO[] = [
  {
    id: 10,
    number: 1,
    sector,
    sponsor: { id: 5, lastName: 'RABE', firstName: 'Jean', matricule: '3/1M-I' },
    memberCount: 4,
    mainName: 'RAKOTO Jean'
  },
  { id: 11, number: 2, sector, sponsor: null, memberCount: 0, mainName: null }
]

describe('HouseholdsTable', () => {
  it('affiche numéro, foyer, secteur, parrain et nombre de membres', () => {
    render(<HouseholdsTable households={households} onOpen={vi.fn()} onDelete={vi.fn()} />)
    const row = screen.getAllByRole('row')[1]!
    expect(
      within(row)
        .getAllByRole('cell')
        .map((c) => c.textContent)
    ).toEqual(['1', 'RAKOTO Jean', 'I · Ambodimanga', 'RABE Jean', '4', ''])
  })

  it('signale le parrain à désigner et le foyer sans membre', () => {
    render(<HouseholdsTable households={households} onOpen={vi.fn()} onDelete={vi.fn()} />)
    const row = screen.getAllByRole('row')[2]!
    expect(row.textContent).toContain('Aucun membre')
    expect(row.textContent).toContain('Parrain à désigner')
  })

  it('ouvre un foyer avec l’œil visible sur chaque ligne', async () => {
    const onOpen = vi.fn()
    render(<HouseholdsTable households={households} onOpen={onOpen} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Voir le foyer 1' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Voir le foyer 2' }))
    expect(onOpen).toHaveBeenCalledWith(households[1])
  })

  it('ouvre aussi un foyer en cliquant sur son nom', async () => {
    const onOpen = vi.fn()
    render(<HouseholdsTable households={households} onOpen={onOpen} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'RAKOTO Jean' }))
    expect(onOpen).toHaveBeenCalledWith(households[0])
  })

  it('supprime un foyer avec la corbeille visible sur chaque ligne', async () => {
    const onDelete = vi.fn()
    render(<HouseholdsTable households={households} onOpen={vi.fn()} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer le foyer 1' }))
    expect(onDelete).toHaveBeenCalledWith(households[0])
  })
})
