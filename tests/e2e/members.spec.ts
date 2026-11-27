import { expect, test, type Page } from '@playwright/test'
import { launchApp, navLink, removeDir } from './app'

/** Choisit le 12 mars 1985 dans le calendrier de la date de naissance. */
async function pickBirthDate(w: Page): Promise<void> {
  await w.getByRole('button', { name: /^Date de naissance/ }).click()
  const cal = w.getByRole('dialog', { name: 'Choisir une date' })
  await cal.getByLabel('Année', { exact: true }).selectOption('1985')
  await cal.getByLabel('Mois', { exact: true }).selectOption('2')
  await cal.getByRole('button', { name: 'mardi 12 mars 1985', exact: true }).click()
  await expect(cal).toHaveCount(0) // fin de l'animation de fermeture
}

async function fillNewMember(w: Page): Promise<void> {
  const form = w.getByRole('dialog', { name: 'Ajouter un fidèle' })
  await form.getByRole('textbox', { name: 'Nom', exact: true }).fill('rakoto')
  await form.getByRole('textbox', { name: 'Prénom' }).fill('rAkoto TiaNa')
  await pickBirthDate(w)
  await form.getByRole('textbox', { name: 'Adresse' }).fill('Lot II A 45, Ambatondrazaka')
}

/**
 * Fidèles (2026-11-27) : ajout avec mise en forme du nom, recherche tolérante aux fautes,
 * avertissement de doublon, modification du téléphone, suppression confirmée.
 */
test('@smoke fidèles : créer, retrouver, modifier et supprimer un fidèle', async () => {
  const running = await launchApp()
  try {
    const w = running.window
    await navLink(w, 'Fidèles').click()
    await expect(w.getByRole('heading', { level: 1, name: 'Fidèles' })).toBeVisible()
    await expect(w.getByRole('heading', { name: 'Aucun fidèle enregistré' })).toBeVisible()

    // Ajout : nom en majuscules, prénom « Rakoto Tiana »
    await w.getByRole('button', { name: 'Ajouter le premier fidèle' }).click()
    await fillNewMember(w)
    await w.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(w.getByText('Fidèle ajouté')).toBeVisible()
    const row = w.getByRole('row', { name: /RAKOTO/ })
    await expect(row).toContainText('Rakoto Tiana')
    await expect(row).toContainText('12/03/1985')

    // Recherche avec une faute
    await w.getByRole('searchbox', { name: 'Rechercher un fidèle' }).fill('rakto')
    await expect(w.getByText('1 résultat pour « rakto »')).toBeVisible()
    await expect(row).toBeVisible()

    // Même fidèle une deuxième fois : avertissement, puis on renonce
    await w.getByRole('button', { name: 'Ajouter un fidèle' }).click()
    await fillNewMember(w)
    await w.getByRole('button', { name: 'Enregistrer' }).click()
    const warning = w.getByRole('alertdialog', { name: 'Ce fidèle existe peut-être déjà' })
    await expect(warning).toContainText('RAKOTO Rakoto Tiana né le 12/03/1985 existe déjà')
    await warning.getByRole('button', { name: 'Annuler' }).click()
    await w.getByRole('button', { name: 'Annuler' }).click()
    await expect(w.getByText('1 résultat pour « rakto »')).toBeVisible()

    // Modification : téléphone formaté pendant la frappe
    await w.getByRole('button', { name: 'Actions de RAKOTO Rakoto Tiana' }).click()
    await w.getByRole('button', { name: 'Modifier RAKOTO Rakoto Tiana' }).click()
    const phone = w.getByRole('textbox', { name: 'Téléphone' })
    await phone.pressSequentially('0341234567')
    await expect(phone).toHaveValue('034 12 345 67')
    await w.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(w.getByText('Modifications enregistrées')).toBeVisible()
    await expect(row).toContainText('034 12 345 67')

    // Suppression confirmée
    await w.getByRole('button', { name: 'Actions de RAKOTO Rakoto Tiana' }).click()
    await w.getByRole('button', { name: 'Supprimer RAKOTO Rakoto Tiana' }).click()
    await w
      .getByRole('alertdialog', { name: 'Supprimer RAKOTO Rakoto Tiana ?' })
      .getByRole('button', { name: 'Supprimer' })
      .click()
    await expect(w.getByText('Fidèle supprimé')).toBeVisible()
    await expect(w.getByText('Aucun fidèle ne correspond à « rakto ».')).toBeVisible()
    await w.getByRole('searchbox', { name: 'Rechercher un fidèle' }).fill('')
    await expect(w.getByRole('heading', { name: 'Aucun fidèle enregistré' })).toBeVisible()
  } finally {
    await running.close()
    removeDir(running.userData)
  }
})
