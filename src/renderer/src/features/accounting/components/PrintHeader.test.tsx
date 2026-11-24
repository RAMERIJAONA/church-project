import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CHURCH_NAME } from '@shared/domain/identity'
import { formatDateTime } from '@shared/utils/dates'
import { AccountingToolbar } from './AccountingToolbar'
import { PrintHeader } from './PrintHeader'

describe('impression', () => {
  it('l’en-tête imprimé donne l’église, la vue et la date d’impression', () => {
    const now = new Date('2026-11-24T09:00:00.000Z')
    const { container } = render(<PrintHeader title="Année 2026" printedAt={now} />)
    const header = container.firstElementChild
    expect(header?.getAttribute('data-print')).toBe('only')
    expect(screen.getByRole('heading', { name: `${CHURCH_NAME} : comptabilité` })).toBeDefined()
    expect(header?.textContent).toContain('Année 2026')
    expect(header?.textContent?.replace(/\s/g, ' ')).toContain(
      `Imprimé le ${formatDateTime(now)}`.replace(/\s/g, ' ')
    )
  })

  it('la barre d’outils propose « Imprimer » et ne s’imprime pas elle-même', async () => {
    const onPrint = vi.fn()
    const { container } = render(
      <AccountingToolbar view="year" onViewChange={vi.fn()} navigation={null} onPrint={onPrint} />
    )
    expect(container.firstElementChild?.getAttribute('data-print')).toBe('hide')
    await userEvent.click(screen.getByRole('button', { name: 'Imprimer' }))
    expect(onPrint).toHaveBeenCalledOnce()
  })
})
