import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { HouseholdSummaryDTO } from '@shared/domain/members/households.types'
import { ConfirmDeleteHouseholdDialog } from './ConfirmDeleteHouseholdDialog'

const sector = { id: 1, number: 1, name: 'Ambodimanga', numeral: 'I' }
const full: HouseholdSummaryDTO = {
  id: 10,
  number: 4,
  sector,
  sponsor: null,
  memberCount: 3,
  mainName: 'RAKOTO Jean'
}

describe('ConfirmDeleteHouseholdDialog', () => {
  it('annonce que les membres seront supprimés avec le foyer', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDeleteHouseholdDialog household={full} onConfirm={onConfirm} onCancel={vi.fn()} />
    )
    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer le foyer 4 (RAKOTO Jean) ?' })
    expect(dialog.textContent).toContain('Ses 3 membres seront supprimés avec lui.')
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer le foyer et ses membres' }))
    expect(onConfirm).toHaveBeenCalledWith(full)
  })

  it('accorde au singulier et dit simplement qu’un foyer vide est supprimé', () => {
    const { rerender } = render(
      <ConfirmDeleteHouseholdDialog
        household={{ ...full, memberCount: 1 }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText(/Son seul membre sera supprimé avec lui\./)).toBeTruthy()
    rerender(
      <ConfirmDeleteHouseholdDialog
        household={{ ...full, memberCount: 0, mainName: null }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('alertdialog', { name: 'Supprimer le foyer 4 ?' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Supprimer le foyer' })).toBeTruthy()
  })
})
