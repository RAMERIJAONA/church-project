import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { EntryDTO } from '@shared/domain/accounting/accounting.types'
import { formatDateTime, formatLongDate } from '@shared/utils/dates'
import { formatAmount } from '@shared/utils/money'
import { makeEntryDTO } from '@tests/factories/accounting.factory'
import { EntriesDialog, type EntriesDialogProps } from './EntriesDialog'

/** Testing Library normalise les espaces affichées (U+00A0, U+202F → espace). */
const shown = (text: string): string => text.replace(/\s/g, ' ')

const kojakoja = makeEntryDTO({ id: 1, amount: 250000, label: 'Kojakoja' })
const fanatsarana = makeEntryDTO({
  id: 2,
  amount: 100000,
  label: 'Fanatsarana',
  operatedOn: '2026-11-22',
  createdAt: '2026-11-24T10:00:00.000Z',
  updatedAt: '2026-11-24T11:30:00.000Z'
})
const DATES = { min: '2026-01-01', max: '2026-12-31', initial: '2026-11-24' }

function setup(props: Partial<EntriesDialogProps> = {}) {
  const handlers = {
    onAdd: vi.fn().mockResolvedValue(undefined),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onAskDelete: vi.fn(),
    onRetry: vi.fn(),
    onClose: vi.fn()
  }
  render(
    <EntriesDialog
      open
      title="Réalisation 2026 de F1-II-1 A)"
      subtitle="Trano Fiangonana (Kojakoja)"
      entries={[kojakoja, fanatsarana] satisfies EntryDTO[]}
      loading={false}
      error={null}
      disabled={false}
      dates={DATES}
      {...handlers}
      {...props}
    />
  )
  return handlers
}

describe('EntriesDialog', () => {
  it('liste les saisies avec libellé, montant, date et heure, et le total', () => {
    setup()
    const dialog = screen.getByRole('dialog', { name: 'Réalisation 2026 de F1-II-1 A)' })
    const rows = within(dialog).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]!).getByText('Kojakoja')).toBeDefined()
    expect(within(rows[0]!).getByText(shown(formatAmount(250000)))).toBeDefined()
    expect(rows[0]?.textContent).toContain(
      shown(`saisi le ${formatDateTime(new Date('2026-11-24T09:00:00.000Z'))}`)
    )
    // Modifiée après sa création : les deux dates sont visibles
    expect(rows[1]?.textContent).toContain(
      shown(`modifié le ${formatDateTime(new Date('2026-11-24T11:30:00.000Z'))}`)
    )
    expect(within(dialog).getByText(shown(`Total : ${formatAmount(350000)}`))).toBeDefined()
  })

  it('ajoute une saisie avec libellé', async () => {
    const { onAdd } = setup()
    await userEvent.type(screen.getByLabelText('Libellé de la nouvelle saisie'), 'Kojakoja')
    await userEvent.type(screen.getByLabelText('Montant de la nouvelle saisie'), '250000')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(onAdd).toHaveBeenCalledWith(250000, 'Kojakoja', '2026-11-24')
  })

  it('choisit la date d’opération d’une réalisation dans le calendrier', async () => {
    const { onAdd } = setup()
    const date = screen.getByRole('button', { name: /^Date de la nouvelle saisie/ })
    expect(date.textContent).toContain('24 nov. 2026')
    await userEvent.click(date)
    const calendar = screen.getByRole('dialog', { name: 'Choisir une date' })
    // Hors de l'année de la case : impossible
    await userEvent.selectOptions(within(calendar).getByLabelText('Mois'), '0')
    expect(within(calendar).getByLabelText<HTMLSelectElement>('Année').value).toBe('2026')
    expect(
      Array.from(within(calendar).getByLabelText<HTMLSelectElement>('Année').options).map(
        (o) => o.value
      )
    ).toEqual(['2026'])
    await userEvent.selectOptions(within(calendar).getByLabelText('Mois'), '2')
    await userEvent.click(within(calendar).getByRole('button', { name: 'dimanche 15 mars 2026' }))
    expect(date.textContent).toContain('15 mars 2026')
    await userEvent.type(screen.getByLabelText('Montant de la nouvelle saisie'), '1000{Enter}')
    expect(onAdd).toHaveBeenCalledWith(1000, null, '2026-03-15')
  })

  it('n’a pas de date pour une estimation', async () => {
    const { onAdd } = setup({ dates: null })
    expect(screen.queryByRole('button', { name: /^Date de la nouvelle saisie/ })).toBeNull()
    await userEvent.type(screen.getByLabelText('Montant de la nouvelle saisie'), '1000{Enter}')
    expect(onAdd).toHaveBeenCalledWith(1000, null, null)
  })

  it('affiche la date d’opération de chaque réalisation', () => {
    setup()
    const rows = screen.getAllByRole('listitem')
    expect(rows[1]?.textContent).toContain(
      shown(`Opération du ${formatLongDate(new Date(2026, 10, 22, 12))}`)
    )
  })

  it('ajoute une saisie sans libellé avec Entrée', async () => {
    const { onAdd } = setup()
    await userEvent.type(screen.getByLabelText('Montant de la nouvelle saisie'), '1000{Enter}')
    expect(onAdd).toHaveBeenCalledWith(1000, null, '2026-11-24')
  })

  it('refuse une saisie sans montant', async () => {
    const { onAdd } = setup()
    await userEvent.type(screen.getByLabelText('Libellé de la nouvelle saisie'), 'X')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('montant')
  })

  it('modifie une saisie', async () => {
    const { onUpdate } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Modifier la saisie Kojakoja' }))
    const amount = screen.getByLabelText('Montant de la saisie Kojakoja')
    await userEvent.clear(amount)
    await userEvent.type(amount, '300000')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(onUpdate).toHaveBeenCalledWith(1, 300000, 'Kojakoja', '2026-11-24')
  })

  it('demande la suppression d’une saisie', async () => {
    const { onAskDelete } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer la saisie Fanatsarana' }))
    expect(onAskDelete).toHaveBeenCalledWith(fanatsarana)
  })

  it('affiche « Aucune saisie » quand la liste est vide', () => {
    setup({ entries: [] })
    expect(screen.getByText('Aucune saisie')).toBeDefined()
  })

  it('propose de réessayer en cas d’erreur', async () => {
    const { onRetry } = setup({ entries: undefined, error: new Error('x') })
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
