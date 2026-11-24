import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CustomRangePicker } from './CustomRangePicker'

function setup() {
  const onChange = vi.fn()
  render(<CustomRangePicker range={{ from: '2026-11-01', to: '2026-11-24' }} onChange={onChange} />)
  return {
    onChange,
    from: screen.getByLabelText<HTMLInputElement>('Du'),
    to: screen.getByLabelText<HTMLInputElement>('Au')
  }
}

describe('CustomRangePicker', () => {
  it('affiche la période et ouvre le calendrier natif', () => {
    const { from, to } = setup()
    expect([from.type, from.value, to.type, to.value]).toEqual([
      'date',
      '2026-11-01',
      'date',
      '2026-11-24'
    ])
  })

  it('change le début ou la fin', () => {
    const { onChange, from, to } = setup()
    fireEvent.change(from, { target: { value: '2026-01-01' } })
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-01-01', to: '2026-11-24' })
    fireEvent.change(to, { target: { value: '2027-03-31' } })
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-01', to: '2027-03-31' })
  })

  it('garde les dates dans l’ordre : l’autre borne suit', () => {
    const { onChange, from, to } = setup()
    fireEvent.change(from, { target: { value: '2026-12-15' } })
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-12-15', to: '2026-12-15' })
    fireEvent.change(to, { target: { value: '2026-10-05' } })
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-10-05', to: '2026-10-05' })
  })

  it('ignore un champ vidé ou une date invalide', () => {
    const { onChange, from } = setup()
    fireEvent.change(from, { target: { value: '' } })
    expect(onChange).not.toHaveBeenCalled()
  })
})
