import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeHouseholdDTO, makeMemberDTO } from '@tests/factories/members.factory'
import { MemberFormDialog, type MemberFormDialogProps } from './MemberFormDialog'

const jean = makeMemberDTO({
  id: 7,
  role: 'father',
  rank: 1,
  firstName: 'Jean',
  baptized: true,
  communicant: true,
  matricule: '1/1M-I'
})
const andry = makeMemberDTO({
  id: 8,
  firstName: 'Andry',
  rank: 3,
  baptized: false,
  matricule: '1/3-I'
})

function setup(props: Partial<MemberFormDialogProps> = {}) {
  const onSubmit = vi.fn()
  const onSubmitAndNext = vi.fn()
  const onCancel = vi.fn()
  render(
    <MemberFormDialog
      open
      initial={null}
      household={makeHouseholdDTO()}
      today="2026-11-27"
      sponsoredHouseholds={[]}
      submitting={false}
      serverError={null}
      onSubmit={onSubmit}
      onSubmitAndNext={onSubmitAndNext}
      onCancel={onCancel}
      {...props}
    />
  )
  const dialog = screen.getByRole('dialog')
  return { onSubmit, onSubmitAndNext, onCancel, dialog }
}

const field = (dialog: HTMLElement, name: string) =>
  within(dialog).getByRole<HTMLInputElement>('textbox', { name })
const radio = (dialog: HTMLElement, group: string, name: 'Oui' | 'Non' | 'Masculin' | 'Féminin') =>
  within(within(dialog).getByRole('radiogroup', { name: group })).getByRole('radio', { name })
const checked = (el: HTMLElement): string | null => el.getAttribute('aria-checked')

describe('MemberFormDialog : saisie', () => {
  it('signale les champs obligatoires, rôle et sexe compris, et n’envoie rien', async () => {
    const { onSubmit, dialog } = setup()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    for (const message of [
      'Choisissez un rôle.',
      'Choisissez le sexe.',
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

  it('formate le téléphone pendant la frappe et refuse un numéro non malgache', async () => {
    const { dialog, onSubmit } = setup({
      initial: andry,
      household: makeHouseholdDTO({ members: [andry] })
    })
    await userEvent.clear(field(dialog, 'Téléphone'))
    await userEvent.type(field(dialog, 'Téléphone'), '0441234567')
    expect(field(dialog, 'Téléphone').value).toBe('044 12 345 67')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(
      within(dialog).getByText('Numéro invalide : 10 chiffres attendus, ex. 034 12 345 67.')
    ).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envoie la fiche complète d’un membre modifié', async () => {
    const household = makeHouseholdDTO({ members: [jean, andry] })
    const { onSubmit, dialog } = setup({ initial: andry, household })
    expect(within(dialog).getByRole('heading', { name: 'Modifier RAKOTO Andry' })).toBeTruthy()
    await userEvent.clear(field(dialog, 'Adresse'))
    await userEvent.type(field(dialog, 'Adresse'), 'Ambohitsara')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(onSubmit).toHaveBeenCalledWith({
      role: 'child',
      sex: 'M',
      lastName: 'RAKOTO',
      firstName: 'Andry',
      birthDate: '1985-03-12',
      address: 'Ambohitsara',
      phone: '034 12 345 67',
      baptized: false,
      communicant: false,
      deacon: false
    })
  })

  it('pré-remplit l’adresse du foyer et propose Enfant pour un membre suivant', () => {
    const { dialog } = setup({ household: makeHouseholdDTO({ members: [jean] }) })
    expect(field(dialog, 'Adresse').value).toBe('Lot II A 45, Ambatondrazaka')
    expect(within(dialog).getByRole<HTMLSelectElement>('combobox', { name: /Rôle/ }).value).toBe(
      'child'
    )
  })

  it('propose « Enregistrer et ajouter un autre » à l’ajout seulement', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Enregistrer et ajouter un autre' })).toBeTruthy()
  })

  it('ne propose pas « Enregistrer et ajouter un autre » en modification', () => {
    setup({ initial: andry, household: makeHouseholdDTO({ members: [andry] }) })
    expect(screen.queryByRole('button', { name: 'Enregistrer et ajouter un autre' })).toBeNull()
  })

  it('ne se ferme pas sur un clic à côté du formulaire (saisie conservée)', async () => {
    const { onCancel, dialog } = setup()
    await userEvent.type(field(dialog, 'Adresse'), 'Ambohitsara')
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    if (!overlay) throw new Error('fond de la fenêtre introuvable')
    fireEvent.pointerDown(overlay, { button: 0, pointerType: 'mouse' })
    fireEvent.click(overlay)
    expect(onCancel).not.toHaveBeenCalled()
    expect(field(dialog, 'Adresse').value).toBe('Ambohitsara')
  })

  it('affiche sous le prénom l’erreur du nom déjà pris', () => {
    const message = 'Un fidèle RAKOTO Tiana existe déjà (né le 12/03/1985, matricule 1/3B-I).'
    const { dialog } = setup({
      initial: andry,
      household: makeHouseholdDTO({ members: [andry] }),
      serverError: { field: 'firstName', message }
    })
    expect(field(dialog, 'Prénom').getAttribute('aria-invalid')).toBe('true')
    expect(within(dialog).getByText(message)).toBeTruthy()
  })
})

describe('MemberFormDialog : rôle, statuts et matricule', () => {
  it('grise les rôles déjà pris en donnant la raison', () => {
    const { dialog } = setup({ household: makeHouseholdDTO({ members: [jean] }) })
    const father = within(dialog).getByRole<HTMLOptionElement>('option', {
      name: 'Père (déjà RAKOTO Jean)'
    })
    expect(father.disabled).toBe(true)
    expect(within(dialog).getByRole<HTMLOptionElement>('option', { name: 'Mère' }).disabled).toBe(
      false
    )
  })

  it('statuts pas à pas : Communiant exige Baptisé, Diacre exige Communiant', async () => {
    const { dialog } = setup()
    const disabled = (group: string) => radio(dialog, group, 'Oui').hasAttribute('disabled')
    // Non baptisé : Communiant et Diacre à Non, grisés
    expect(checked(radio(dialog, 'Communiant', 'Non'))).toBe('true')
    expect([disabled('Baptisé'), disabled('Communiant'), disabled('Diacre')]).toEqual([
      false,
      true,
      true
    ])
    expect(within(dialog).getByText('Seul un fidèle baptisé peut être communiant.')).toBeTruthy()
    // Baptisé : Communiant possible, Diacre toujours grisé
    await userEvent.click(radio(dialog, 'Baptisé', 'Oui'))
    expect([disabled('Communiant'), disabled('Diacre')]).toEqual([false, true])
    expect(within(dialog).getByText('Seul un communiant peut être diacre.')).toBeTruthy()
    // Communiant : Diacre possible ; Baptisé verrouillé à Oui
    await userEvent.click(radio(dialog, 'Communiant', 'Oui'))
    expect([disabled('Baptisé'), disabled('Diacre')]).toEqual([true, false])
    // Diacre : Communiant verrouillé à Oui ; décocher Diacre ne retire rien
    await userEvent.click(radio(dialog, 'Diacre', 'Oui'))
    expect(disabled('Communiant')).toBe(true)
    await userEvent.click(radio(dialog, 'Diacre', 'Non'))
    expect(checked(radio(dialog, 'Communiant', 'Oui'))).toBe('true')
    expect(checked(radio(dialog, 'Baptisé', 'Oui'))).toBe('true')
    expect(disabled('Communiant')).toBe(false)
  })

  it('recalcule le matricule pendant la saisie : B si baptisé, M seul si communiant', async () => {
    const household = makeHouseholdDTO({ members: [jean, andry] })
    const { dialog } = setup({ initial: andry, household })
    const preview = within(dialog).getByLabelText('Matricule')
    expect(preview.textContent).toBe('1/3-I')
    await userEvent.click(radio(dialog, 'Baptisé', 'Oui'))
    expect(preview.textContent).toBe('1/3B-I')
    await userEvent.click(radio(dialog, 'Communiant', 'Oui'))
    expect(preview.textContent).toBe('1/3M-I')
    await userEvent.click(radio(dialog, 'Communiant', 'Non'))
    expect(preview.textContent).toBe('1/3B-I')
  })

  it('prévient que le matricule change avec le rôle', async () => {
    const household = makeHouseholdDTO({ members: [andry] })
    const { dialog } = setup({ initial: andry, household })
    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: /Rôle/ }), 'father')
    expect(within(dialog).getByText('Son matricule deviendra 1/1-I.')).toBeTruthy()
  })

  it('prévient qu’un parrain qui n’est plus diacre libère ses foyers', async () => {
    const deacon = { ...jean, deacon: true }
    const { dialog } = setup({
      initial: deacon,
      household: makeHouseholdDTO({ members: [deacon] }),
      sponsoredHouseholds: [3, 7]
    })
    expect(within(dialog).queryByText(/Parrain des foyers/)).toBeNull()
    await userEvent.click(radio(dialog, 'Diacre', 'Non'))
    expect(
      within(dialog).getByText(
        'Parrain des foyers 3 et 7 : ils passeront en « Parrain à désigner ».'
      )
    ).toBeTruthy()
  })

  it('affiche foyer, secteur, parrain et âge', () => {
    const household = makeHouseholdDTO({
      members: [andry],
      sponsor: { id: 5, lastName: 'RABE', firstName: 'Jean', matricule: '3/1M-I' }
    })
    const { dialog } = setup({ initial: andry, household })
    const summary = within(dialog).getByRole('group', { name: 'Fiche' })
    expect(summary.textContent).toContain('Foyer 1')
    expect(summary.textContent).toContain('I · Ambodimanga')
    expect(summary.textContent).toContain('RABE Jean')
    expect(summary.textContent).toContain('41 ans')
  })

  it('choisir Père impose Masculin et grise le sexe ; Mère impose Féminin', async () => {
    const { dialog } = setup()
    const role = within(dialog).getByRole('combobox', { name: /Rôle/ })
    await userEvent.click(radio(dialog, 'Sexe', 'Féminin'))
    await userEvent.selectOptions(role, 'father')
    expect(checked(radio(dialog, 'Sexe', 'Masculin'))).toBe('true')
    expect(radio(dialog, 'Sexe', 'Féminin')).toHaveProperty('disabled', true)
    expect(within(dialog).getByText('Un père est toujours de sexe masculin.')).toBeTruthy()
    await userEvent.selectOptions(role, 'mother')
    expect(checked(radio(dialog, 'Sexe', 'Féminin'))).toBe('true')
    expect(radio(dialog, 'Sexe', 'Masculin')).toHaveProperty('disabled', true)
    await userEvent.selectOptions(role, 'child')
    expect(radio(dialog, 'Sexe', 'Masculin')).toHaveProperty('disabled', false)
    expect(checked(radio(dialog, 'Sexe', 'Féminin'))).toBe('true')
  })

  it('grise le sexe d’un père déjà enregistré', () => {
    const { dialog } = setup({ initial: jean, household: makeHouseholdDTO({ members: [jean] }) })
    expect(checked(radio(dialog, 'Sexe', 'Masculin'))).toBe('true')
    expect(radio(dialog, 'Sexe', 'Féminin')).toHaveProperty('disabled', true)
  })
})
