import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { formatAmount } from '@shared/utils/money'
import { makeItemDTO, makeRootDTO } from '@tests/factories/accounting.factory'
import { PeriodSheet } from './PeriodSheet'
import { ViewSwitch } from './ViewSwitch'

const shown = (text: string): string => text.replace(/\s/g, ' ')

const i1 = makeItemDTO({ id: 3, code: 'A1-I-1', level: 3, description: 'Karama' })
const i2 = makeItemDTO({ id: 4, code: 'A1-I-2', level: 3, description: 'Fanomezana' })
const i = makeItemDTO({ id: 2, code: 'A1-I', amounts: null, children: [i1, i2] })
// Rubrique principale sans sous-rubrique : elle porte des montants
const b1 = makeRootDTO({
  id: 5,
  code: 'B1',
  prefix: 'B',
  description: 'ADIDY',
  amounts: makeItemDTO().amounts
})
const items = [makeRootDTO({ id: 1, code: 'A1', children: [i] }), b1]

describe('PeriodSheet', () => {
  it('affiche les réalisations de la période pour chaque rubrique qui porte des montants', () => {
    render(
      <PeriodSheet
        label="Semaine du 23 au 29 novembre 2026"
        items={items}
        totals={
          new Map([
            [3, 420000],
            [5, 1000]
          ])
        }
      />
    )
    expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual([
      'A1',
      'A1-I',
      'A1-I-1',
      'A1-I-2',
      'B1'
    ])
    expect(screen.getByRole('columnheader', { name: 'Réalisations' })).toBeDefined()
    expect(
      screen.getByRole('table', { name: 'Réalisations : semaine du 23 au 29 novembre 2026' })
    ).toBeDefined()
    const rowOf = (code: string) =>
      shown(screen.getByRole('rowheader', { name: code }).closest('tr')?.textContent ?? '')
    expect(rowOf('A1-I-1')).toContain(shown(formatAmount(420000)))
    expect(rowOf('B1')).toContain(shown(formatAmount(1000)))
    expect(rowOf('A1-I-2')).toBe('A1-I-2Fanomezana')
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('signale une période sans réalisation', () => {
    render(<PeriodSheet label="Mardi 24 novembre 2026" items={items} totals={new Map()} />)
    expect(screen.getByText('Aucune réalisation sur cette période.')).toBeDefined()
  })
})

describe('ViewSwitch', () => {
  it('indique la vue choisie et en change', async () => {
    const onChange = vi.fn()
    render(<ViewSwitch view="year" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Année' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Mois' }).getAttribute('aria-pressed')).toBe('false')
    await userEvent.click(screen.getByRole('button', { name: 'Semaine' }))
    expect(onChange).toHaveBeenCalledWith('week')
  })
})
