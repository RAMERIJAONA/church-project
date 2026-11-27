import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeMemberDTO } from '@tests/factories/members.factory'
import { MemberFormDialog, type MemberFormDialogProps } from './MemberFormDialog'

function setup(props: Partial<MemberFormDialogProps> = {}) {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  render(
    <MemberFormDialog
      open
      initial={null}
      today="2026-11-27"
      submitting={false}
      serverError={null}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />
  )
  const dialog = screen.getByRole('dialog')
  return { onSubmit, onCancel, dialog }
}

const field = (dialog: HTMLElement, name: string) =>
  within(dialog).getByRole<HTMLInputElement>('textbox', { name })

describe('MemberFormDialog', () => {
  it('signale les quatre champs obligatoires et n’envoie rien', async () => {
    const { onSubmit, dialog } = setup()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    for (const message of [
      'Le nom est obligatoire.',
      'Le prénom est obligatoire.',
      'La date de naissance est obligatoire.',
      'L’adresse est obligatoire.'
    ]) {
      expect(within(dialog).getByText(message)).toBeTruthy()
    }
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('met le nom et le prénom en forme à la sortie du champ', async () => {
    const { dialog } = setup()
    await userEvent.type(field(dialog, 'Nom'), 'rakoto')
    await userEvent.type(field(dialog, 'Prénom'), 'rAkoto TiaNa')
    await userEvent.tab()
    expect(field(dialog, 'Nom').value).toBe('RAKOTO')
    expect(field(dialog, 'Prénom').value).toBe('Rakoto Tiana')
  })

  it('formate le téléphone pendant la frappe', async () => {
    const { dialog } = setup()
    await userEvent.type(field(dialog, 'Téléphone'), '0341234567')
    expect(field(dialog, 'Téléphone').value).toBe('034 12 345 67')
  })

  it('grise Communiant tant que Baptême vaut Non, et le remet à Non', async () => {
    const { dialog } = setup()
    const communicant = within(dialog).getByRole('radiogroup', { name: 'Membre communiant' })
    const baptism = within(dialog).getByRole('radiogroup', { name: 'Baptême' })
    expect(within(communicant).getByRole('radio', { name: 'Oui' })).toHaveProperty('disabled', true)
    expect(within(dialog).getByText('Un membre communiant est toujours baptisé.')).toBeTruthy()

    await userEvent.click(within(baptism).getByRole('radio', { name: 'Oui' }))
    await userEvent.click(within(communicant).getByRole('radio', { name: 'Oui' }))
    expect(
      within(communicant).getByRole('radio', { name: 'Oui' }).getAttribute('aria-checked')
    ).toBe('true')
    await userEvent.click(within(baptism).getByRole('radio', { name: 'Non' }))
    expect(
      within(communicant).getByRole('radio', { name: 'Non' }).getAttribute('aria-checked')
    ).toBe('true')
  })

  it('envoie la saisie complète', async () => {
    const { onSubmit, dialog } = setup({ initial: makeMemberDTO() })
    expect(within(dialog).getByRole('heading', { name: 'Modifier RAKOTO Tiana' })).toBeTruthy()
    expect(field(dialog, 'Téléphone').value).toBe('034 12 345 67')
    await userEvent.clear(field(dialog, 'Secteur'))
    await userEvent.type(field(dialog, 'Secteur'), 'Sud')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(onSubmit).toHaveBeenCalledWith({
      lastName: 'RAKOTO',
      firstName: 'Tiana',
      birthDate: '1985-03-12',
      address: 'Lot II A 45, Ambatondrazaka',
      phone: '034 12 345 67',
      sector: 'Sud',
      registrationNumber: 'M-0042',
      baptized: true,
      communicant: false
    })
  })

  it('refuse un téléphone qui n’est pas malgache', async () => {
    const { onSubmit, dialog } = setup({ initial: makeMemberDTO() })
    await userEvent.clear(field(dialog, 'Téléphone'))
    await userEvent.type(field(dialog, 'Téléphone'), '0441234567')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(
      within(dialog).getByText('Numéro invalide : 10 chiffres attendus, ex. 034 12 345 67.')
    ).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('ne se ferme pas sur un clic à côté du formulaire (saisie conservée)', async () => {
    const { onCancel, dialog } = setup()
    await userEvent.type(field(dialog, 'Adresse'), 'Ambohitsara')
    // Clic sur le fond : la fenêtre modale y bloque user-event, on émet l'événement que Radix écoute
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    if (!overlay) throw new Error('fond de la fenêtre introuvable')
    fireEvent.pointerDown(overlay, { button: 0, pointerType: 'mouse' })
    fireEvent.click(overlay)
    expect(onCancel).not.toHaveBeenCalled()
    expect(field(dialog, 'Adresse').value).toBe('Ambohitsara')
  })

  it('affiche l’erreur du matricule sous le champ', () => {
    const { dialog } = setup({
      initial: makeMemberDTO(),
      serverError: {
        field: 'registrationNumber',
        message: 'Le matricule M-0042 est déjà attribué à RASOA Nirina.'
      }
    })
    const input = field(dialog, 'Matricule')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(
      within(dialog).getByText('Le matricule M-0042 est déjà attribué à RASOA Nirina.')
    ).toBeTruthy()
  })
})
