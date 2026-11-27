import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeMemberDTO } from '@tests/factories/members.factory'
import { MembersTable } from './MembersTable'

function setup() {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const member = makeMemberDTO()
  const other = makeMemberDTO({
    id: 2,
    lastName: 'RASOA',
    firstName: 'Nirina',
    phone: null,
    baptized: false,
    matricule: '1/4-I'
  })
  render(<MembersTable members={[member, other]} onEdit={onEdit} onDelete={onDelete} />)
  return { onEdit, onDelete, member }
}

describe('MembersTable', () => {
  it('affiche les informations formatées du fidèle', () => {
    setup()
    const row = screen.getByRole('row', { name: /RAKOTO/ })
    expect(row.textContent).toContain('Tiana')
    expect(row.textContent).toContain('12/03/1985')
    expect(row.textContent).toContain('034 12 345 67')
    expect(row.textContent).toContain('Lot II A 45, Ambatondrazaka')
    expect(row.textContent).toContain('1/3B-I')
    const cells = within(row)
      .getAllByRole('cell')
      .map((c) => c.textContent)
    expect(cells).toContain('Oui')
    expect(cells).toContain('Non')
  })

  it('laisse vides les informations absentes', () => {
    setup()
    const row = screen.getByRole('row', { name: /RASOA/ })
    expect(row.textContent).not.toContain('null')
    expect(row.textContent).not.toContain('—')
  })

  it('propose Modifier et Supprimer dans le menu de la ligne', async () => {
    const { onEdit, onDelete, member } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Actions de RAKOTO Tiana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Modifier RAKOTO Tiana' }))
    expect(onEdit).toHaveBeenCalledWith(member)
    await userEvent.click(screen.getByRole('button', { name: 'Actions de RAKOTO Tiana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer RAKOTO Tiana' }))
    expect(onDelete).toHaveBeenCalledWith(member)
  })
})
