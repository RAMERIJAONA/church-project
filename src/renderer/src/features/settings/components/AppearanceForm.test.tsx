import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeSettings } from '@tests/factories/settings.factory'
import { AppearanceForm } from './AppearanceForm'

describe('AppearanceForm', () => {
  it('coche les valeurs courantes', () => {
    render(
      <AppearanceForm
        settings={makeSettings({ theme: 'dark', accent: 'green' })}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByRole('radio', { name: 'Sombre' })).toHaveProperty('ariaChecked', 'true')
    expect(screen.getByRole('radio', { name: 'Vert' })).toHaveProperty('ariaChecked', 'true')
  })

  it('demande le thème sombre au clic', async () => {
    const onChange = vi.fn()
    render(<AppearanceForm settings={makeSettings({ theme: 'light' })} onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Sombre' }))
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('demande une autre couleur d’accent', async () => {
    const onChange = vi.fn()
    render(<AppearanceForm settings={makeSettings()} onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Rose' }))
    expect(onChange).toHaveBeenCalledWith({ accent: 'rose' })
  })

  it('désactive tous les choix pendant un enregistrement', () => {
    render(<AppearanceForm settings={makeSettings()} disabled onChange={vi.fn()} />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).toHaveProperty('disabled', true)
  })
})
