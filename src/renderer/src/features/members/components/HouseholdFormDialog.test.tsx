import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { HouseholdDTO, SponsorDTO } from '@shared/domain/members/households.types'
import type { SectorDTO } from '@shared/domain/members/sectors.types'
import { HouseholdFormDialog, type HouseholdFormDialogProps } from './HouseholdFormDialog'

const sectors: SectorDTO[] = [
  { id: 1, number: 1, numeral: 'I', name: 'Ambodimanga', householdCount: 1, memberCount: 3 },
  { id: 2, number: 2, numeral: 'II', name: 'Antanety', householdCount: 0, memberCount: 0 }
]
const rabe: SponsorDTO = { id: 5, lastName: 'RABE', firstName: 'Jean', matricule: '3/1M-I' }

function setup(props: Partial<HouseholdFormDialogProps> = {}) {
  const onSubmit = vi.fn()
  render(
    <MemoryRouter>
      <HouseholdFormDialog
        open
        initial={null}
        sectors={sectors}
        sponsorOptions={[rabe]}
        onSponsorSearch={vi.fn()}
        submitting={false}
        serverError={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  )
  return { onSubmit }
}

describe('HouseholdFormDialog', () => {
  it('crée un foyer avec un secteur et un parrain à désigner par défaut', async () => {
    const { onSubmit } = setup()
    expect(screen.getByRole('button', { name: /Parrain/ }).textContent).toContain('À désigner')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Secteur/ }), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le foyer' }))
    expect(onSubmit).toHaveBeenCalledWith({ sectorId: 2, sponsorId: null })
  })

  it('choisit le parrain parmi les diacres proposés', async () => {
    const { onSubmit } = setup()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Secteur/ }), '1')
    await userEvent.click(screen.getByRole('button', { name: /Parrain/ }))
    await userEvent.click(screen.getByRole('option', { name: /RABE Jean/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Créer le foyer' }))
    expect(onSubmit).toHaveBeenCalledWith({ sectorId: 1, sponsorId: 5 })
  })

  it('exige un secteur', async () => {
    const { onSubmit } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Créer le foyer' }))
    expect(screen.getByText('Choisissez un secteur.')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renvoie vers les secteurs quand il n’y en a aucun', () => {
    setup({ sectors: [] })
    expect(screen.getByRole('link', { name: 'Créer un secteur' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Créer le foyer' })).toHaveProperty('disabled', true)
  })

  it('prévient que les matricules changent avec le secteur', async () => {
    const initial: HouseholdDTO = {
      id: 10,
      number: 4,
      sector: { id: 1, number: 1, name: 'Ambodimanga', numeral: 'I' },
      sponsor: rabe,
      memberCount: 3,
      mainLastName: 'RAKOTO',
      members: [],
      takenRanks: [1, 2, 3],
      lastChildRank: 3
    }
    const { onSubmit } = setup({ initial })
    expect(screen.getByRole('heading', { name: 'Modifier le foyer 4' })).toBeTruthy()
    expect(screen.queryByText(/matricules des 3 membres/)).toBeNull()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Secteur/ }), '2')
    expect(screen.getByText('Les matricules des 3 membres vont changer (secteur II).')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(onSubmit).toHaveBeenCalledWith({ sectorId: 2, sponsorId: 5 })
  })
})
