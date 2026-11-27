import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeMemberDTO } from '@tests/factories/members.factory'
import { MoveMemberDialog } from './MoveMemberDialog'

function setup(sex: 'M' | 'F') {
  render(
    <MoveMemberDialog
      member={makeMemberDTO({ sex })}
      target={undefined}
      onNumberChange={vi.fn()}
      submitting={false}
      serverError={null}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />
  )
  const option = (name: string) => screen.getByRole<HTMLOptionElement>('option', { name })
  return { option }
}

describe('MoveMemberDialog', () => {
  it('ne propose pas Père pour une femme', () => {
    const { option } = setup('F')
    expect(option('Père (sexe masculin)').disabled).toBe(true)
    expect(option('Mère').disabled).toBe(false)
  })

  it('ne propose pas Mère pour un homme', () => {
    const { option } = setup('M')
    expect(option('Mère (sexe féminin)').disabled).toBe(true)
    expect(option('Père').disabled).toBe(false)
  })
})
