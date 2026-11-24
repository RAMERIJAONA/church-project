import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomRangePicker } from './CustomRangePicker'

function setup() {
  const onChange = vi.fn()
  render(<CustomRangePicker range={{ from: '2026-11-01', to: '2026-11-24' }} onChange={onChange} />)
  return { onChange }
}

/** Ouvre le champ « Du » ou « Au » et choisit un jour du mois affiché. */
async function pick(field: 'Du' | 'Au', day: string): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${field}`) }))
  await userEvent.click(screen.getByRole('button', { name: day }))
}

describe('CustomRangePicker', () => {
  it('affiche la période en français', () => {
    setup()
    expect(screen.getByRole('button', { name: /^Du/ }).textContent).toContain('1 nov. 2026')
    expect(screen.getByRole('button', { name: /^Au/ }).textContent).toContain('24 nov. 2026')
  })

  it('change le début ou la fin', async () => {
    const { onChange } = setup()
    await pick('Du', 'mardi 3 novembre 2026')
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-03', to: '2026-11-24' })
    await pick('Au', 'lundi 30 novembre 2026')
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-01', to: '2026-11-30' })
  })

  it('garde les dates dans l’ordre : l’autre borne suit', async () => {
    const { onChange } = setup()
    await pick('Du', 'samedi 28 novembre 2026')
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-28', to: '2026-11-28' })
    await pick('Au', 'jeudi 29 octobre 2026') // jour du mois précédent visible dans la grille
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-10-29', to: '2026-10-29' })
  })
})
