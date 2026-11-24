import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DateField, type DateFieldProps } from './DateField'

function setup(props: Partial<DateFieldProps> = {}) {
  const onChange = vi.fn()
  render(
    <>
      <span id="label-du">Du</span>
      <DateField labelId="label-du" value="2026-11-24" onChange={onChange} {...props} />
    </>
  )
  const trigger = screen.getByRole('button', { name: /^Du/ })
  return { onChange, trigger }
}

const open = async (trigger: HTMLElement) => {
  await userEvent.click(trigger)
  return screen.getByRole('dialog', { name: 'Choisir une date' })
}

describe('DateField : calendrier en français', () => {
  it('affiche la date choisie en français', () => {
    const { trigger } = setup()
    expect(trigger.textContent).toContain('24 nov. 2026')
  })

  it('ouvre le mois de la date, semaines du lundi au dimanche', async () => {
    const { trigger } = setup()
    const cal = await open(trigger)
    expect(within(cal).getByLabelText<HTMLSelectElement>('Mois').value).toBe('10')
    expect(within(cal).getByLabelText<HTMLSelectElement>('Année').value).toBe('2026')
    const days = within(cal)
      .getAllByRole('columnheader')
      .map((h) => h.textContent)
    expect(days).toEqual(['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'])
    const selected = within(cal).getByRole('gridcell', { selected: true })
    expect(within(selected).getByRole('button').getAttribute('aria-label')).toBe(
      'mardi 24 novembre 2026'
    )
  })

  it('choisit un jour et se referme', async () => {
    const { trigger, onChange } = setup()
    const cal = await open(trigger)
    await userEvent.click(within(cal).getByRole('button', { name: 'mardi 10 novembre 2026' }))
    expect(onChange).toHaveBeenCalledWith('2026-11-10')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('change de mois et d’année', async () => {
    const { trigger, onChange } = setup()
    const cal = await open(trigger)
    await userEvent.click(within(cal).getByRole('button', { name: 'Mois suivant' }))
    expect(within(cal).getByLabelText<HTMLSelectElement>('Mois').value).toBe('11')
    await userEvent.selectOptions(within(cal).getByLabelText('Mois'), '2')
    await userEvent.selectOptions(within(cal).getByLabelText('Année'), '2025')
    await userEvent.click(within(cal).getByRole('button', { name: 'samedi 15 mars 2025' }))
    expect(onChange).toHaveBeenCalledWith('2025-03-15')
  })

  it('désactive les jours hors des bornes', async () => {
    const { trigger } = setup({ min: '2026-11-05', max: '2026-11-25' })
    const cal = await open(trigger)
    const day = (name: string) => within(cal).getByRole('button', { name })
    expect(day('mercredi 4 novembre 2026')).toHaveProperty('disabled', true)
    expect(day('jeudi 26 novembre 2026')).toHaveProperty('disabled', true)
    expect(day('jeudi 5 novembre 2026')).toHaveProperty('disabled', false)
  })

  it('se pilote au clavier : flèches puis Entrée', async () => {
    const { trigger, onChange } = setup()
    await open(trigger)
    expect(document.activeElement?.getAttribute('aria-label')).toBe('mardi 24 novembre 2026')
    await userEvent.keyboard('{ArrowRight}{ArrowDown}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('mercredi 2 décembre 2026')
    await userEvent.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('2026-12-02')
  })
})
