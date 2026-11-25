import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { summaryPeriods } from '../accounting.utils'
import { SummaryTable, type SummaryRow } from './SummaryTable'

const columns = summaryPeriods('2026-11-25').map((p) => ({ ...p, active: p.kind === 'month' }))
const rows: SummaryRow[] = [
  {
    label: 'Estimation 2026',
    hint: 'au prorata des jours',
    cells: [{ value: 1_370 }, { value: 9_589 }, { value: 41_096 }, { value: 500_000 }]
  },
  { label: 'Réalisation 2026', cells: [1, 2, 3, 4].map(() => ({ value: 770_000 })) },
  {
    label: 'Estimation 2027',
    cells: [{ value: null }, { value: null }, { value: null }, { value: 600_000 }]
  }
]

const cellsOf = (label: string): string[] =>
  within(screen.getByRole('rowheader', { name: new RegExp(`^${label}`) }).closest('tr')!)
    .getAllByRole('cell')
    .map((c) => c.textContent?.replace(/\s/g, ' ') ?? '')

describe('SummaryTable', () => {
  it('affiche prévu et réalisé par période, « — » quand sans objet', () => {
    render(<SummaryTable columns={columns} rows={rows} failed={false} onSelect={vi.fn()} />)
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Aujourd’huiMercredi 25 novembre 2026',
      'Cette semaineSemaine du 23 au 29 novembre 2026',
      'Ce moisNovembre 2026',
      'Cette annéeAnnée 2026'
    ])
    expect(cellsOf('Estimation 2026')).toEqual(['1 370 Ar', '9 589 Ar', '41 096 Ar', '500 000 Ar'])
    expect(cellsOf('Estimation 2027')).toEqual(['—', '—', '—', '600 000 Ar'])
  })

  it('ouvre la vue de la période au clic sur la colonne et marque la vue affichée', async () => {
    const onSelect = vi.fn()
    render(<SummaryTable columns={columns} rows={rows} failed={false} onSelect={onSelect} />)
    expect(screen.getByRole('button', { name: /^Ce mois/ }).getAttribute('aria-pressed')).toBe(
      'true'
    )
    await userEvent.click(screen.getByRole('button', { name: /^Cette semaine/ }))
    expect(onSelect).toHaveBeenCalledWith('week')
  })

  it('indique le chargement et l’erreur', () => {
    const loading = rows.map((r) => ({ ...r, cells: r.cells.map(() => ({ value: undefined })) }))
    render(<SummaryTable columns={columns} rows={loading} failed onSelect={vi.fn()} />)
    expect(screen.getAllByText('…')).toHaveLength(12)
    expect(screen.getByText(/chargement impossible/)).toBeDefined()
  })
})
