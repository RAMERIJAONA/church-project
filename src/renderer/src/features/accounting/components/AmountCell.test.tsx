import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { formatAriary } from '@shared/utils/money'
import { formatShortDateTime } from '@shared/utils/dates'
import { makeCellDTO } from '@tests/factories/accounting.factory'
import { AmountCell, type AmountCellProps } from './AmountCell'

const LABEL = 'Réalisation 2026 de A1-I'

function setup(props: Partial<AmountCellProps> = {}) {
  const onCommit = vi.fn()
  const onOpenDetail = vi.fn()
  render(
    <table>
      <tbody>
        <tr>
          <AmountCell
            cell={makeCellDTO()}
            label={LABEL}
            year={2026}
            disabled={false}
            onCommit={onCommit}
            onOpenDetail={onOpenDetail}
            {...props}
          />
        </tr>
      </tbody>
    </table>
  )
  return { onCommit, onOpenDetail }
}

describe('AmountCell', () => {
  it('édite une case simple', async () => {
    const { onCommit } = setup()
    const input = screen.getByRole('textbox', { name: LABEL })
    await userEvent.click(input)
    await userEvent.keyboard('1500000{Enter}')
    expect(onCommit).toHaveBeenCalledWith(1500000)
  })

  it('affiche une case détaillée en lecture seule', async () => {
    const { onOpenDetail } = setup({
      cell: makeCellDTO({ total: 3500, entryCount: 2, detailed: true })
    })
    expect(screen.queryByRole('textbox')).toBeNull()
    // Testing Library normalise les espaces affichées (U+00A0 → espace) : même chose ici
    expect(screen.getByText(formatAriary(3500).replace(/\s/g, ' '))).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: `Détail : ${LABEL}` }))
    expect(onOpenDetail).toHaveBeenCalledOnce()
  })

  it('invite à saisir dans une case vide, sans date', () => {
    setup()
    expect(screen.getByRole('textbox', { name: LABEL }).getAttribute('placeholder')).toBe('Montant')
    expect(screen.queryByTitle(/Dernière saisie/)).toBeNull()
  })

  it('affiche « Ar » et la date et l’heure de la dernière saisie sous le montant', () => {
    const at = '2026-11-25T11:32:00.000Z'
    setup({ cell: makeCellDTO({ total: 150000, entryCount: 1, lastEntryAt: at }) })
    expect(screen.getByText('Ar')).toBeDefined()
    expect(screen.getByTitle(/Dernière saisie/).textContent).toBe(formatShortDateTime(new Date(at)))
  })

  it('saisie faite après la fin de l’année de la case : année seule', () => {
    const at = '2026-02-03T09:00:00.000Z'
    setup({ year: 2025, cell: makeCellDTO({ total: 1, entryCount: 1, lastEntryAt: at }) })
    expect(screen.getByTitle(/Dernière saisie/).textContent).toBe('2025')
  })

  it('désactive la case quand demandé', () => {
    setup({ disabled: true })
    expect(screen.getByRole('textbox', { name: LABEL })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: `Détail : ${LABEL}` })).toHaveProperty(
      'disabled',
      true
    )
  })
})
