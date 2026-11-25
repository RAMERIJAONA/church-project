import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { YearTotals } from './YearTotals'

const card = (name: string): HTMLElement => screen.getByText(name).parentElement as HTMLElement

describe('YearTotals', () => {
  it('affiche le total de chaque colonne : estimations N, réalisations N, estimations N+1', () => {
    render(
      <YearTotals year={2026} totals={{ estimate: 500000, actual: 770000, nextEstimate: null }} />
    )
    const region = screen.getByRole('region', { name: 'Totaux de l’année 2026' })
    expect(
      within(region)
        .getAllByRole('term')
        .map((t) => t.textContent)
    ).toEqual([
      'Total des estimations 2026',
      'Total des réalisations 2026',
      'Total des estimations 2027'
    ])
    expect(card('Total des estimations 2026').textContent).toMatch(
      /^Total des estimations 2026500\s000\sAr$/
    )
    expect(card('Total des réalisations 2026').textContent).toMatch(/770\s000\sAr$/)
    // Colonne sans montant : 0 Ar
    expect(card('Total des estimations 2027').textContent).toMatch(/2027 ?0\sAr$/)
  })

  it('indique le chargement', () => {
    render(<YearTotals year={2026} totals={undefined} />)
    expect(screen.getAllByText('…')).toHaveLength(3)
  })
})
