import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NewSectionForm } from './NewSectionForm'

function setup(sections = [{ prefix: 'A' }, { prefix: 'A' }, { prefix: 'B' }]) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(<NewSectionForm sections={sections} busy={false} onSubmit={onSubmit} onCancel={vi.fn()} />)
  return {
    onSubmit,
    letter: screen.getByLabelText<HTMLSelectElement>('Lettre'),
    preview: () => screen.getByRole('status', { name: 'Numéro attribué' }).textContent
  }
}

describe('NewSectionForm', () => {
  it('ne propose que les lettres utilisées et la suivante en malgache (pas de C)', () => {
    const { letter } = setup()
    expect(Array.from(letter.options).map((o) => o.value)).toEqual(['A', 'B', 'D'])
    expect(letter.options[2]?.textContent).toContain('nouvelle lettre')
  })

  it('continue la dernière lettre par défaut et montre le numéro attribué', async () => {
    const { letter, preview } = setup()
    expect(letter.value).toBe('B')
    expect(preview()).toBe('B2')
    await userEvent.selectOptions(letter, 'A')
    expect(preview()).toBe('A3')
    await userEvent.selectOptions(letter, 'D')
    expect(preview()).toBe('D1')
  })

  it('commence à A sur un tableau vide', () => {
    const { letter, preview } = setup([])
    expect(Array.from(letter.options).map((o) => o.value)).toEqual(['A'])
    expect(preview()).toBe('A1')
  })

  it('envoie la description en majuscules', async () => {
    const { onSubmit } = setup()
    await userEvent.type(screen.getByLabelText('Description'), '  asa iombonana ')
    await userEvent.click(screen.getByRole('button', { name: 'Créer la rubrique' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ prefix: 'B', description: 'ASA IOMBONANA' })
  })

  it('refuse une description vide', async () => {
    const { onSubmit } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Créer la rubrique' }))
    expect(screen.getByRole('alert').textContent).toContain('description est obligatoire')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
