import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SectorDTO } from '@shared/domain/members/sectors.types'
import { SectorsTable } from './SectorsTable'

const sectors: SectorDTO[] = [
  { id: 1, number: 1, numeral: 'I', name: 'Ambodimanga', householdCount: 12, memberCount: 48 },
  { id: 2, number: 2, numeral: 'II', name: 'Antanety', householdCount: 0, memberCount: 0 }
]

describe('SectorsTable', () => {
  it('affiche numéro romain, nom, foyers et fidèles', () => {
    render(<SectorsTable sectors={sectors} onRename={vi.fn()} />)
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers.slice(0, 4)).toEqual(['Numéro', 'Nom', 'Foyers', 'Fidèles'])
    const row = screen.getByRole('row', { name: /Antanety/ })
    expect(
      within(row)
        .getAllByRole('cell')
        .map((c) => c.textContent)
        .slice(0, 4)
    ).toEqual(['II', 'Antanety', '0', '0'])
  })

  it('propose de renommer chaque secteur', async () => {
    const onRename = vi.fn()
    render(<SectorsTable sectors={sectors} onRename={onRename} />)
    await userEvent.click(screen.getByRole('button', { name: 'Renommer Ambodimanga' }))
    expect(onRename).toHaveBeenCalledWith(sectors[0])
  })
})
