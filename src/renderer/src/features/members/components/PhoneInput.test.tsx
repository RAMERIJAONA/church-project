import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { PhoneInput } from './PhoneInput'

function Harness(): React.JSX.Element {
  const [value, setValue] = useState('')
  return <PhoneInput aria-label="Téléphone" value={value} onValueChange={setValue} />
}

describe('PhoneInput', () => {
  it('Retour arrière sur une espace efface le chiffre voisin', async () => {
    render(<Harness />)
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Téléphone' })
    await userEvent.type(input, '03412')
    expect(input.value).toBe('034 12')
    await userEvent.type(input, '{Backspace}', { initialSelectionStart: 4, initialSelectionEnd: 4 })
    expect(input.value).toBe('031 2')
  })
})
