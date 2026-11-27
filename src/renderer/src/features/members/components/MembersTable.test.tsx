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
  it('affiche les colonnes de la liste globale dans l’ordre demandé', () => {
    setup()
    expect(
      screen
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
        .slice(0, 11)
    ).toEqual([
      'Matricule',
      'Nom',
      'Prénom',
      'Date de naissance',
      'Âge',
      'Téléphone',
      'Adresse',
      'Secteur',
      'Diacre',
      'Parrain diacre',
      'Foyer'
    ])
  })

  it('affiche matricule, âge, diacre, parrain et foyer', () => {
    setup()
    const [first, second] = screen.getAllByRole('row').slice(1)
    const cells = within(first!)
      .getAllByRole('cell')
      .map((c) => c.textContent)
    expect(cells.slice(0, 11)).toEqual([
      '1/3M-I',
      'RAKOTO',
      'Tiana',
      '28/11/1984',
      '41 ans',
      '034 12 345 67',
      'Lot II A 45, Ambatondrazaka',
      'I · Ambodimanga',
      'Diacre',
      'RABE Jean',
      'Foyer 1'
    ])
    expect(second!.textContent).toContain('À désigner')
    expect(second!.textContent).not.toContain('null')
  })

  it('trie en cliquant sur un en-tête et indique le tri en cours', async () => {
    const { onSort } = setup({ sort: 'matricule', order: 'desc' })
    expect(screen.getByRole('columnheader', { name: /Matricule/ }).getAttribute('aria-sort')).toBe(
      'descending'
    )
    expect(screen.getByRole('columnheader', { name: /^Nom/ }).getAttribute('aria-sort')).toBe(
      'none'
    )
    await userEvent.click(screen.getByRole('button', { name: /trier par foyer/i }))
    expect(onSort).toHaveBeenCalledWith('household')
  })

  it('ouvre le foyer du fidèle et propose Modifier, Voir le foyer, Supprimer', async () => {
    const { onEdit, onDelete, onOpenHousehold } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Foyer 4' }))
    expect(onOpenHousehold).toHaveBeenCalledWith(nirina)
    await userEvent.click(screen.getByRole('button', { name: 'Actions de RAKOTO Tiana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Modifier RAKOTO Tiana' }))
    expect(onEdit).toHaveBeenCalledWith(tiana)
    await userEvent.click(screen.getByRole('button', { name: 'Actions de RAKOTO Tiana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Voir le foyer de RAKOTO Tiana' }))
    expect(onOpenHousehold).toHaveBeenCalledWith(tiana)
    await userEvent.click(screen.getByRole('button', { name: 'Actions de RAKOTO Tiana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer RAKOTO Tiana' }))
    expect(onDelete).toHaveBeenCalledWith(tiana)
  })
})
