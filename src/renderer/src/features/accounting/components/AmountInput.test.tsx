import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { THOUSANDS_SEPARATOR } from '@shared/utils/money'
import { AmountInput } from './AmountInput'

/** Valeur affichée, séparateur rendu visible : « 2 000 000 » → '2_000_000'. */
const shown = (el: HTMLElement): string =>
  (el as HTMLInputElement).value.split(THOUSANDS_SEPARATOR).join('_')

function renderTwo(onFirst = vi.fn(), value: number | null = null) {
  render(
    <table>
      <tbody>
        <tr>
          <td>
            <AmountInput value={value} label="Montant A1-1" onCommit={onFirst} />
          </td>
        </tr>
        <tr>
          <td>
            <AmountInput value={null} label="Montant A1-2" onCommit={vi.fn()} />
          </td>
        </tr>
      </tbody>
    </table>
  )
  return {
    first: screen.getByRole('textbox', { name: 'Montant A1-1' }),
    second: screen.getByRole('textbox', { name: 'Montant A1-2' })
  }
}

describe('AmountInput', () => {
  it('affiche le montant groupé par milliers avec une espace', () => {
    const { first } = renderTwo(vi.fn(), 7654321)
    expect(shown(first)).toBe('7_654_321')
  })

  it('garde le curseur au bon endroit quand on tape au milieu', async () => {
    const { first } = renderTwo()
    await userEvent.type(first, '200000')
    const input = first as HTMLInputElement
    input.setSelectionRange(1, 1) // « 2|00 000 »
    await userEvent.keyboard('5')
    expect(shown(first)).toBe('2_500_000')
    expect(input.selectionStart).toBe(3) // « 2 5|00 000 »
  })

  it('met les espaces pendant la frappe', async () => {
    const { first } = renderTwo()
    await userEvent.type(first, '2000')
    expect(shown(first)).toBe('2_000')
    await userEvent.type(first, '000')
    expect(shown(first)).toBe('2_000_000')
  })

  it('Retour arrière juste après une espace efface le chiffre d’avant', async () => {
    const { first } = renderTwo()
    await userEvent.type(first, '2000000')
    const input = first as HTMLInputElement
    input.setSelectionRange(2, 2) // « 2 |000 000 »
    await userEvent.keyboard('{Backspace}')
    expect(shown(first)).toBe('000_000') // le « 2 » est effacé
    expect(input.selectionStart).toBe(0)
    await userEvent.keyboard('3')
    expect(shown(first)).toBe('3_000_000')
  })

  it('normalise à l’enregistrement (zéros de tête)', async () => {
    const onCommit = vi.fn()
    const { first } = renderTwo(onCommit)
    await userEvent.type(first, '0005{Enter}')
    expect(onCommit).toHaveBeenCalledWith(5)
  })

  it('Entrée enregistre une seule fois et passe à la case suivante', async () => {
    const onCommit = vi.fn()
    const { first, second } = renderTwo(onCommit)
    await userEvent.type(first, '7,654,321{Enter}')
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(7654321)
    expect(document.activeElement).toBe(second)
  })

  it('Échap annule sans enregistrer', async () => {
    const onCommit = vi.fn()
    const { first } = renderTwo(onCommit, 100)
    await userEvent.type(first, '999{Escape}')
    expect(onCommit).not.toHaveBeenCalled()
    expect((first as HTMLInputElement).value).toBe('100')
  })

  it('ignore tout ce qui n’est pas un chiffre (pas de décimales en Ariary)', async () => {
    const onCommit = vi.fn()
    const { first } = renderTwo(onCommit)
    await userEvent.type(first, '1a2,5{Enter}')
    expect(onCommit).toHaveBeenCalledWith(125)
  })

  it('vider la case efface le montant ; ne rien changer n’envoie rien', async () => {
    const onCommit = vi.fn()
    const { first } = renderTwo(onCommit, 100)
    await userEvent.click(first)
    await userEvent.tab()
    expect(onCommit).not.toHaveBeenCalled()
    await userEvent.clear(first)
    await userEvent.tab()
    expect(onCommit).toHaveBeenCalledWith(null)
  })
})
