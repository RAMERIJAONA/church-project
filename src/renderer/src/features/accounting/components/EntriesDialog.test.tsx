import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { EntryDTO } from '@shared/domain/accounting/accounting.types'
import { formatDateTime } from '@shared/utils/dates'
import { formatAriary } from '@shared/utils/money'
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
      year={2026}
      today="2026-11-26"
      disabled={false}
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
    expect(within(rows[0]!).getByText(shown(formatAriary(250000)))).toBeDefined()
    expect(rows[0]?.textContent).toContain(
      shown(`Saisi le ${formatDateTime(new Date('2026-11-24T09:00:00.000Z'))}`)
    )
    // Modifiée après sa création : les deux dates sont visibles
    expect(rows[1]?.textContent).toContain(
      shown(`modifié le ${formatDateTime(new Date('2026-11-24T11:30:00.000Z'))}`)
    )
    expect(within(dialog).getByText(shown(`Total : ${formatAriary(350000)}`))).toBeDefined()
  })

  it('ajoute une saisie avec libellé', async () => {
    const { onAdd } = setup()
    await userEvent.type(screen.getByLabelText('Libellé de la nouvelle saisie'), 'Kojakoja')
    await userEvent.type(screen.getByLabelText('Montant de la nouvelle saisie'), '250000')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(onAdd).toHaveBeenCalledWith(250000, 'Kojakoja')
  })

  it('ne demande pas de date : elle est enregistrée automatiquement', () => {
    setup()
    expect(screen.queryByRole('button', { name: /^Date/ })).toBeNull()
  })

  it('saisie faite après la fin de l’année de la case : année seule', () => {
    setup({ year: 2025 })
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]?.textContent).toContain('Saisi après 2025')
    expect(rows[0]?.textContent).not.toContain('novembre')
  })

  it('ajoute une saisie sans libellé avec Entrée', async () => {
    const { onAdd } = setup()
    await userEvent.type(screen.getByLabelText('Montant de la nouvelle saisie'), '1000{Enter}')
    expect(onAdd).toHaveBeenCalledWith(1000, null)
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
    expect(onUpdate).toHaveBeenCalledWith(1, 300000, 'Kojakoja')
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

  // Demande du porteur (2026-11-26) : filtre du détail par date de saisie, Du / Au
  describe('filtre par date de saisie', () => {
    const older = makeEntryDTO({
      id: 3,
      amount: 40000,
      label: 'Taloha',
      createdAt: '2026-11-10T09:00:00.000Z',
      updatedAt: '2026-11-10T09:00:00.000Z'
    })
    const setupFilter = () => setup({ entries: [kojakoja, fanatsarana, older] })
    const pick = async (field: 'Du' | 'Au', day: string): Promise<void> => {
      await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${field}`) }))
      await userEvent.click(screen.getByRole('button', { name: day }))
    }

    it('couvre par défaut toutes les saisies, de la première à aujourd’hui', () => {
      setupFilter()
      const filter = screen.getByRole('group', { name: 'Filtrer par date de saisie' })
      expect(within(filter).getByRole('button', { name: /^Du/ }).textContent).toContain(
        '10 nov. 2026'
      )
      expect(within(filter).getByRole('button', { name: /^Au/ }).textContent).toContain(
        '26 nov. 2026'
      )
      expect(screen.getAllByRole('listitem')).toHaveLength(3)
      expect(screen.queryByRole('status')).toBeNull()
      expect(screen.getByText(shown(`Total : ${formatAriary(390000)}`))).toBeDefined()
    })

    it('n’affiche que les saisies de la période, avec les deux totaux', async () => {
      setupFilter()
      await pick('Du', 'mardi 24 novembre 2026')
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
      expect(screen.queryByText('Taloha')).toBeNull()
      expect(screen.getByRole('status').textContent).toBe('2 saisies sur 3')
      expect(
        screen.getByText(shown(`Total des saisies filtrées : ${formatAriary(350000)}`))
      ).toBeDefined()
      expect(screen.getByText(shown(`Total de la case : ${formatAriary(390000)}`))).toBeDefined()

      await userEvent.click(screen.getByRole('button', { name: 'Toutes les dates' }))
      expect(screen.getAllByRole('listitem')).toHaveLength(3)
      expect(screen.queryByRole('status')).toBeNull()
    })

    it('annonce une période sans saisie', async () => {
      setupFilter()
      await pick('Du', 'mercredi 25 novembre 2026')
      expect(screen.queryAllByRole('listitem')).toHaveLength(0)
      expect(screen.getByText('Aucune saisie sur cette période')).toBeDefined()
      expect(screen.getByRole('status').textContent).toBe('0 saisie sur 3')
    })
  })

  it('propose de réessayer en cas d’erreur', async () => {
    const { onRetry } = setup({ entries: undefined, error: new Error('x') })
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
