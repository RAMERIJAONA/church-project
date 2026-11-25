import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Ledger } from '@shared/domain/accounting/accounting.types'
import { NewSectionForm } from './NewSectionForm'

function setup(sections = [{ prefix: 'A' }, { prefix: 'B' }], ledger: Ledger = 'expense') {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(
    <NewSectionForm
      ledger={ledger}
      roots={sections}
      busy={false}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />
  )
  return {
    onSubmit,
    preview: () => screen.getByRole('status', { name: 'Numéro attribué' }).textContent
  }
}

describe('NewSectionForm', () => {
  // Règle du porteur (2026-11-25) : une lettre par rubrique principale, chiffre fixe
  it('sorties : toujours la lettre suivante avec 1 (D1, jamais B2), sans choix de lettre', () => {
    const { preview } = setup()
    expect(preview()).toBe('D1')
    expect(screen.queryByLabelText('Lettre')).toBeNull()
  })

  it('entrées : toujours la lettre suivante avec 2 (D2, jamais B3)', () => {
    expect(setup([{ prefix: 'A' }, { prefix: 'B' }], 'income').preview()).toBe('D2')
  })

  it('commence à A1 (sorties) ou A2 (entrées) sur un tableau vide', () => {
    expect(setup([]).preview()).toBe('A1')
    cleanup()
    expect(setup([], 'income').preview()).toBe('A2')
  })

  it('envoie la description en majuscules', async () => {
    const { onSubmit } = setup()
    await userEvent.type(screen.getByLabelText('Description'), '  asa iombonana ')
    await userEvent.click(screen.getByRole('button', { name: 'Créer la rubrique' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ description: 'ASA IOMBONANA' })
  })

  it('refuse une description vide', async () => {
    const { onSubmit } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Créer la rubrique' }))
    expect(screen.getByRole('alert').textContent).toContain('description est obligatoire')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
