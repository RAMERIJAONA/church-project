import { join } from 'node:path'
import Database from 'better-sqlite3'
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

    // Même nom et prénom une deuxième fois : refusé (règle du porteur, 2026-11-27)
    await w.getByRole('button', { name: 'Ajouter un fidèle' }).click()
    await fillNewMember(w)
    await w.getByRole('button', { name: 'Enregistrer' }).click()
    const form = w.getByRole('dialog', { name: 'Ajouter un fidèle' })
    await expect(form).toContainText(
      'Un fidèle RAKOTO Rakoto Tiana existe déjà (né le 12/03/1985).'
    )
    await expect(form.getByRole('textbox', { name: 'Prénom' })).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    await form.getByRole('button', { name: 'Annuler' }).click()
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

/**
 * Seul le tableau défile (demande du porteur, 2026-11-27) : titre, recherche et nombre de
 * fidèles restent en place, l'en-tête des colonnes reste visible.
 */
test('@smoke fidèles : seul le tableau défile', async () => {
  // 1er lancement : migrations ; puis 60 fidèles fictifs écrits directement en base
  const first = await launchApp()
  const userData = first.userData
  await first.close()
  const db = new Database(join(userData, 'data.db'))
  const now = '2026-11-27T09:00:00.000Z'
  const insert = db.prepare(
    `INSERT INTO members (last_name, first_name, birth_date, address, created_at, updated_at)
     VALUES (?, 'Tiana', '1985-03-12', 'Ambatondrazaka', ?, ?)`
  )
  for (let i = 0; i < 60; i++) insert.run(`NOM${String(i).padStart(2, '0')}`, now, now)
  db.close()

  const running = await launchApp({ userData })
  try {
    const w = running.window
    await navLink(w, 'Fidèles').click()
    await expect(w.getByText('60 fidèles')).toBeVisible()
    const search = w.getByRole('searchbox', { name: 'Rechercher un fidèle' })
    const list = w.getByRole('region', { name: 'Liste des fidèles' })
    const header = list.getByRole('columnheader', { name: 'Nom', exact: true })
    const searchTop = (await search.boundingBox())?.y
    const headerTop = (await header.boundingBox())?.y

    await list.hover()
    await w.mouse.wheel(0, 2000)
    await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    // La page elle-même ne défile pas : recherche, nombre et en-tête restent en place
    expect(await w.locator('main').evaluate((el) => el.scrollTop)).toBe(0)
    expect((await search.boundingBox())?.y).toBe(searchTop)
    await expect(w.getByText('60 fidèles')).toBeInViewport()
    expect((await header.boundingBox())?.y).toBe(headerTop)
    // Pagination toujours visible sous le tableau
    await expect(w.getByRole('navigation', { name: 'Pages' })).toBeInViewport()
  } finally {
    await running.close()
    removeDir(userData)
  }
})
