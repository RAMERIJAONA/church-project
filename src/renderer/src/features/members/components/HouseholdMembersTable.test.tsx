import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeMemberDTO } from '@tests/factories/members.factory'
import { HouseholdMembersTable, type HouseholdMembersTableProps } from './HouseholdMembersTable'

const jean = makeMemberDTO({
  id: 1,
  role: 'father',
  rank: 1,
  firstName: 'Jean',
  deacon: true,
  communicant: true,
  matricule: '1/1M-I'
})
const andry = makeMemberDTO({
  id: 2,
  rank: 3,
  firstName: 'Andry',
  birthDate: '1984-11-28',
  matricule: '1/3B-I'
})
const soa = makeMemberDTO({ id: 3, rank: 4, firstName: 'Soa', sex: 'F', matricule: '1/4B-I' })

function setup(props: Partial<HouseholdMembersTableProps> = {}) {
  const handlers = { onOpen: vi.fn(), onDelete: vi.fn(), onSwap: vi.fn() }
  render(
    <HouseholdMembersTable
      members={[jean, andry, soa]}
      today="2026-11-27"
      {...handlers}
      {...props}
    />
  )
  return handlers
}

describe('HouseholdMembersTable', () => {
  it('regroupe en 5 colonnes, par rang, sans répéter secteur ni parrain du foyer', () => {
    setup()
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    // Secteur et parrain sont les mêmes pour tout le foyer : affichés dans l'en-tête de la page
    expect(headers.slice(0, 5)).toEqual(['Matricule', 'Rôle', 'Fidèle', 'Naissance', 'Téléphone'])
    expect(headers).not.toContain('Secteur')
    expect(headers).not.toContain('Parrain')
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getAllByRole('cell')[0]?.textContent)).toEqual([
      '1/1M-I',
      '1/3B-I',
      '1/4B-I'
    ])
  })

  it('montre l’adresse sous le nom et l’âge sous la date de naissance', () => {
    setup()
    const cells = within(screen.getAllByRole('row')[2]!).getAllByRole('cell')
    expect(within(cells[2]!).getByText('Lot II A 45, Ambatondrazaka')).toBeTruthy()
    expect(within(cells[3]!).getByText('28/11/1984')).toBeTruthy()
    expect(within(cells[3]!).getByText('41 ans')).toBeTruthy()
  })

  it('n’affiche la flèche ↑ ni sur le premier enfant, ni la flèche ↓ sur le dernier', async () => {
    const { onSwap } = setup()
    expect(screen.queryByRole('button', { name: 'Monter RAKOTO Andry' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Descendre RAKOTO Soa' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Descendre RAKOTO Jean' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Descendre RAKOTO Andry' }))
    expect(onSwap).toHaveBeenCalledWith(andry, 'down')
    await userEvent.click(screen.getByRole('button', { name: 'Monter RAKOTO Soa' }))
    expect(onSwap).toHaveBeenCalledWith(soa, 'up')
  })

  it('supprime avec la corbeille visible sur chaque ligne, sans menu ni Déplacer', async () => {
    const { onOpen, onDelete } = setup()
    expect(screen.queryByRole('button', { name: /^Actions de/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Déplacer/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer RAKOTO Andry' }))
    expect(onDelete).toHaveBeenCalledWith(andry)
    await userEvent.click(screen.getByRole('button', { name: 'RAKOTO Andry' }))
    expect(onOpen).toHaveBeenCalledWith(andry)
  })

  it('modifie un membre avec le crayon visible sur chaque ligne', async () => {
    const { onOpen } = setup()
    for (const name of ['RAKOTO Jean', 'RAKOTO Andry', 'RAKOTO Soa']) {
      expect(screen.getByRole('button', { name: `Modifier ${name}` })).toBeTruthy()
    }
    await userEvent.click(screen.getByRole('button', { name: 'Modifier RAKOTO Andry' }))
    expect(onOpen).toHaveBeenCalledWith(andry)
  })
})
