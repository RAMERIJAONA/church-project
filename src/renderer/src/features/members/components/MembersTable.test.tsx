import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeMemberDTO } from '@tests/factories/members.factory'
import { MembersTable, type MembersTableProps } from './MembersTable'

const tiana = makeMemberDTO({
  birthDate: '1984-11-28',
  deacon: true,
  communicant: true,
  matricule: '1/3M-I',
  sponsor: { id: 9, lastName: 'RABE', firstName: 'Jean', matricule: '2/1M-I' }
})
const nirina = makeMemberDTO({
  id: 2,
  lastName: 'RASOA',
  firstName: 'Nirina',
  phone: null,
  householdId: 4,
  householdNumber: 4,
  matricule: '4/3-I'
})

function setup(props: Partial<MembersTableProps> = {}) {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onOpenHousehold: vi.fn(), onSort: vi.fn() }
  render(
    <MembersTable
      members={[tiana, nirina]}
      today="2026-11-27"
      sort="name"
      order="asc"
      {...handlers}
      {...props}
    />
  )
  return handlers
}

describe('MembersTable', () => {
  it('regroupe les informations en 7 colonnes, sans défilement horizontal', () => {
    setup()
    expect(
      screen
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
        .slice(0, 7)
    ).toEqual(['Matricule', 'Fidèle', 'Naissance', 'Téléphone', 'Secteur', 'Parrain', 'Foyer'])
  })

  it('affiche nom, diacre et adresse ensemble, l’âge sous la date, le parrain et le foyer', () => {
    setup()
    const [first, second] = screen.getAllByRole('row').slice(1)
    const cells = within(first!).getAllByRole('cell')
    expect(cells[0]?.textContent).toBe('1/3M-I')
    const person = within(cells[1]!)
    expect(person.getByText('RAKOTO Tiana')).toBeTruthy()
    expect(person.getByText('Diacre')).toBeTruthy()
    expect(person.getByText('Lot II A 45, Ambatondrazaka')).toBeTruthy()
    expect(within(cells[2]!).getByText('28/11/1984')).toBeTruthy()
    expect(within(cells[2]!).getByText('41 ans')).toBeTruthy()
    expect(cells.slice(3, 7).map((c) => c.textContent)).toEqual([
      '034 12 345 67',
      'I · Ambodimanga',
      'RABE Jean',
      'Foyer 1'
    ])
    expect(second!.textContent).toContain('À désigner')
    expect(second!.textContent).not.toContain('Diacre')
    expect(second!.textContent).not.toContain('null')
  })

  it('trie en cliquant sur un en-tête et indique le tri en cours', async () => {
    const { onSort } = setup({ sort: 'matricule', order: 'desc' })
    expect(screen.getByRole('columnheader', { name: /Matricule/ }).getAttribute('aria-sort')).toBe(
      'descending'
    )
    expect(screen.getByRole('columnheader', { name: /^Fidèle/ }).getAttribute('aria-sort')).toBe(
      'none'
    )
    await userEvent.click(screen.getByRole('button', { name: /trier par foyer/i }))
    expect(onSort).toHaveBeenCalledWith('household')
  })

  it('ouvre le foyer du fidèle et propose le crayon Modifier, puis Voir le foyer et Supprimer dans le menu', async () => {
    const { onEdit, onDelete, onOpenHousehold } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Foyer 4' }))
    expect(onOpenHousehold).toHaveBeenCalledWith(nirina)
    // Crayon visible sur chaque ligne, sans ouvrir le menu
    await userEvent.click(screen.getByRole('button', { name: 'Modifier RAKOTO Tiana' }))
    expect(onEdit).toHaveBeenCalledWith(tiana)
    await userEvent.click(screen.getByRole('button', { name: 'Actions de RAKOTO Tiana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Voir le foyer de RAKOTO Tiana' }))
    expect(onOpenHousehold).toHaveBeenCalledWith(tiana)
    await userEvent.click(screen.getByRole('button', { name: 'Actions de RAKOTO Tiana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer RAKOTO Tiana' }))
    expect(onDelete).toHaveBeenCalledWith(tiana)
  })

  it('ne répète pas Modifier dans le menu « ⋯ »', async () => {
    setup()
    expect(screen.getByRole('button', { name: 'Modifier RASOA Nirina' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Actions de RASOA Nirina' }))
    expect(screen.getAllByRole('button', { name: 'Modifier RASOA Nirina' })).toHaveLength(1)
  })
})
