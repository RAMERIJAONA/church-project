import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SectorFormDialog, type SectorFormDialogProps } from './SectorFormDialog'

function setup(props: Partial<SectorFormDialogProps> = {}) {
  const onSubmit = vi.fn()
  render(
    <SectorFormDialog
      open
      initial={null}
      nextNumeral="III"
      submitting={false}
      serverError={null}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      {...props}
    />
  )
  return { onSubmit, name: screen.getByRole('textbox', { name: /Nom/ }) }
}

describe('SectorFormDialog', () => {
  it('montre le nom mis en forme et le numéro qu’il recevra', async () => {
    const { name } = setup()
    await userEvent.type(name, 'ambohitsara avaratra')
    expect(screen.getByText('Sera enregistré : Ambohitsara Avaratra (n° III)')).toBeTruthy()
  })

  it('envoie le nom saisi', async () => {
    const { name, onSubmit } = setup()
    await userEvent.type(name, 'antanety')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(onSubmit).toHaveBeenCalledWith('antanety')
  })

  it('refuse un nom vide', async () => {
    const { onSubmit } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(screen.getByText('Le nom est obligatoire.')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renomme en gardant le numéro, et affiche l’erreur du service sous le champ', () => {
    setup({
      initial: {
        id: 2,
        number: 2,
        numeral: 'II',
        name: 'Antanety',
        householdCount: 0,
        memberCount: 0
      },
      serverError: 'Le secteur Ambodimanga existe déjà (n° I).'
    })
    expect(screen.getByRole('heading', { name: 'Renommer le secteur II' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: /Nom/ })).toHaveProperty('value', 'Antanety')
    expect(screen.getByText('Le secteur Ambodimanga existe déjà (n° I).')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Renommer' })).toBeTruthy()
  })
})
