import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeSettings } from '@tests/factories/settings.factory'
import { AppearanceForm } from './AppearanceForm'

describe('AppearanceForm', () => {
  it('demande le passage en sombre depuis le thème clair', async () => {
    const onChange = vi.fn()
    render(<AppearanceForm settings={makeSettings({ theme: 'light' })} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /sombre/i }))
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it("désactive l'action pendant un enregistrement", () => {
    render(<AppearanceForm settings={makeSettings()} disabled onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /sombre/i })).toHaveProperty('disabled', true)
  })
})
