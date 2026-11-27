import { join } from 'node:path'
import Database from 'better-sqlite3'
import { expect, test, type Locator, type Page } from '@playwright/test'
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

const yes = (form: Locator, group: string): Locator =>
  form.getByRole('radiogroup', { name: group }).getByRole('radio', { name: 'Oui' })

interface NewMember {
  role?: 'head' | 'father' | 'mother' | 'child'
  sex: 'Masculin' | 'Féminin'
  lastName: string
  firstName: string
  address?: string
  baptized?: boolean
  communicant?: boolean
}

/** Remplit la fiche ouverte d'un nouveau membre (rôle laissé tel quel s'il n'est pas donné). */
async function fillMember(w: Page, householdNumber: number, m: NewMember): Promise<Locator> {
  const form = w.getByRole('dialog', { name: `Ajouter un membre au foyer ${householdNumber}` })
  if (m.role) await form.getByRole('combobox', { name: 'Rôle' }).selectOption(m.role)
  const sex = form.getByRole('radiogroup', { name: 'Sexe' }).getByRole('radio', { name: m.sex })
  // Père et Mère imposent le sexe, grisé (porteur, 2026-11-27)
  if (m.role === 'father' || m.role === 'mother') {
    await expect(sex).toHaveAttribute('aria-checked', 'true')
    await expect(sex).toBeDisabled()
  } else await sex.click()
  await form.getByRole('textbox', { name: 'Nom', exact: true }).fill(m.lastName)
  await form.getByRole('textbox', { name: 'Prénom' }).fill(m.firstName)
  await pickBirthDate(w)
  if (m.address) await form.getByRole('textbox', { name: 'Adresse' }).fill(m.address)
  if (m.baptized) await yes(form, 'Baptisé').click()
  if (m.communicant) await yes(form, 'Communiant').click()
  return form
}

const matricules = (w: Page, region: string): Promise<string[]> =>
  w.getByRole('region', { name: region }).locator('tbody tr td:first-child').allTextContents()

async function addSector(w: Page, name: string): Promise<void> {
  await w.getByRole('button', { name: 'Ajouter un secteur' }).click()
  const form = w.getByRole('dialog', { name: 'Ajouter un secteur' })
  await form.getByRole('textbox', { name: 'Nom' }).fill(name)
  await form.getByRole('button', { name: 'Ajouter' }).click()
  await expect(w.getByText('Secteur ajouté').last()).toBeVisible()
}

async function createHousehold(w: Page, sector: string, sponsor?: string): Promise<void> {
  await navLink(w, 'Foyers').click()
  await w.getByRole('button', { name: 'Nouveau foyer' }).click()
  const form = w.getByRole('dialog', { name: 'Nouveau foyer' })
  await form.getByRole('combobox', { name: 'Secteur' }).selectOption({ label: sector })
  if (sponsor) {
    await form.getByRole('button', { name: 'Parrain' }).click()
    await w.getByRole('option', { name: new RegExp(sponsor) }).click()
  }
  await form.getByRole('button', { name: 'Créer le foyer' }).click()
}

/**
 * Fidèles organisés par foyers (porteur, 2026-11-27) : secteurs numérotés I, II ; foyer créé
 * puis membres ajoutés à la chaîne ; matricules calculés ; diacre parrain d'un autre foyer ;
 * liste globale (filtre, recherche avec une faute) ; mise à jour d'un matricule dans les deux
 * listes ; suppression d'un enfant sans changer les rangs des autres.
 */
test('@smoke fidèles : secteurs, foyers, membres, matricules et liste globale', async () => {
  const running = await launchApp()
  try {
    const w = running.window
    // Secteurs : numéro dans l'ordre de création, gardé au renommage
    await navLink(w, 'Secteurs').click()
    await expect(w.getByText('Aucun secteur.', { exact: false })).toBeVisible()
    await addSector(w, 'ambodimanga')
    await addSector(w, 'antanety')
    await w.getByRole('button', { name: 'Renommer Antanety' }).click()
    const rename = w.getByRole('dialog', { name: 'Renommer le secteur II' })
    await rename.getByRole('textbox', { name: 'Nom' }).fill('antanety atsimo')
    await rename.getByRole('button', { name: 'Renommer' }).click()
    await expect(w.getByRole('row', { name: /Antanety Atsimo/ })).toContainText('II')

    // Foyer 1, parrain à désigner : la fiche du premier membre s'ouvre aussitôt
    await createHousehold(w, 'I · Ambodimanga')
    await expect(w.getByRole('heading', { name: 'Foyer 1' })).toBeVisible()
    let form = await fillMember(w, 1, {
      role: 'father',
      sex: 'Masculin',
      lastName: 'rakoto',
      firstName: 'jean',
      address: 'Lot II A 45, Ambatondrazaka',
      baptized: true,
      communicant: true
    })
    await expect(form.getByLabel('Matricule')).toHaveText('1/1MB-I')
    await form.getByRole('button', { name: 'Enregistrer et ajouter un autre' }).click()
    await expect(w.getByText('Membre ajouté : 1/1MB-I')).toBeVisible()
    form = await fillMember(w, 1, {
      role: 'mother',
      sex: 'Féminin',
      lastName: 'rakoto',
      firstName: 'soa',
      baptized: true
    })
    // Adresse reprise du foyer
    await expect(form.getByRole('textbox', { name: 'Adresse' })).toHaveValue(
      'Lot II A 45, Ambatondrazaka'
    )
    await form.getByRole('button', { name: 'Enregistrer et ajouter un autre' }).click()
    await expect(w.getByText('Membre ajouté : 1/2B-I')).toBeVisible()
    form = await fillMember(w, 1, { sex: 'Masculin', lastName: 'rakoto', firstName: 'andry' })
    await form.getByRole('button', { name: 'Enregistrer et ajouter un autre' }).click()
    await expect(w.getByText('Membre ajouté : 1/3-I')).toBeVisible()
    form = await fillMember(w, 1, { sex: 'Féminin', lastName: 'rakoto', firstName: 'fara' })
    await form.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(w.getByText('Membre ajouté : 1/4-I')).toBeVisible()
    await expect
      .poll(() => matricules(w, 'Membres du foyer'))
      .toEqual(['1/1MB-I', '1/2B-I', '1/3-I', '1/4-I'])

    // Le père devient diacre : son matricule ne change pas
    await w.getByRole('button', { name: 'RAKOTO Jean', exact: true }).click()
    form = w.getByRole('dialog', { name: 'Modifier RAKOTO Jean' })
    await yes(form, 'Diacre').click()
    await form.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(w.getByText('Modifications enregistrées')).toBeVisible()
    await expect(w.getByRole('row', { name: /1\/1MB-I/ })).toContainText('Diacre')

    // Foyer 2, secteur II, parrain : le diacre (seuls les diacres sont proposés)
    await createHousehold(w, 'II · Antanety Atsimo', 'RAKOTO Jean')
    await expect(w.getByRole('heading', { name: 'Foyer 2' })).toBeVisible()
    await expect(w.getByText('Parrain : RAKOTO Jean')).toBeVisible()
    form = await fillMember(w, 2, {
      role: 'head',
      sex: 'Féminin',
      lastName: 'rasoa',
      firstName: 'nirina',
      address: 'Antanety'
    })
    await form.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(w.getByText('Membre ajouté : 2/1-II')).toBeVisible()

    // Liste globale : mêmes matricules, filtre, recherche avec une faute
    await navLink(w, 'Liste des fidèles, tous foyers confondus').click()
    await expect(w.getByText('5 fidèles')).toBeVisible()
    const list = w.getByRole('region', { name: 'Liste des fidèles' })
    await expect(list.getByRole('row', { name: /RASOA/ })).toContainText('RAKOTO Jean')
    await w
      .getByRole('group', { name: 'Filtres' })
      .getByRole('combobox', { name: 'Secteur' })
      .selectOption({ label: 'II · Antanety Atsimo' })
    await expect.poll(() => matricules(w, 'Liste des fidèles')).toEqual(['2/1-II'])
    await w.getByRole('button', { name: 'Effacer les filtres' }).click()
    await w.getByRole('searchbox', { name: 'Rechercher un fidèle' }).fill('rakto')
    await expect(w.getByText('4 résultats pour « rakto »')).toBeVisible()

    // Baptême d'un enfant depuis la liste globale : matricule à jour dans les deux listes
    const andry = list.getByRole('row', { name: /Andry/ })
    await andry.getByRole('button', { name: 'RAKOTO', exact: true }).click()
    form = w.getByRole('dialog', { name: 'Modifier RAKOTO Andry' })
    await yes(form, 'Baptisé').click()
    await form.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(andry).toContainText('1/3B-I')
    await andry.getByRole('button', { name: 'Foyer 1' }).click()
    await expect(w.getByRole('heading', { name: 'Foyer 1' })).toBeVisible()
    await expect.poll(() => matricules(w, 'Membres du foyer')).toContain('1/3B-I')

    // Suppression d'un enfant : les rangs des autres ne bougent pas
    await w.getByRole('button', { name: 'Actions de RAKOTO Andry' }).click()
    await w.getByRole('button', { name: 'Supprimer RAKOTO Andry' }).click()
    await w
      .getByRole('alertdialog', { name: 'Supprimer RAKOTO Andry ?' })
      .getByRole('button', { name: 'Supprimer' })
      .click()
    await expect(w.getByText('Fidèle supprimé')).toBeVisible()
    await expect
      .poll(() => matricules(w, 'Membres du foyer'))
      .toEqual(['1/1MB-I', '1/2B-I', '1/4-I'])
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
  // 1er lancement : migrations ; puis un secteur, un foyer et 60 enfants fictifs écrits en base
  const first = await launchApp()
  const userData = first.userData
  await first.close()
  const db = new Database(join(userData, 'data.db'))
  const now = '2026-11-27T09:00:00.000Z'
  db.prepare(
    `INSERT INTO sectors (id, number, name, created_at, updated_at) VALUES (1, 1, 'Ambodimanga', ?, ?)`
  ).run(now, now)
  db.prepare(
    `INSERT INTO households (id, number, sector_id, last_child_rank, created_at, updated_at)
     VALUES (1, 1, 1, 62, ?, ?)`
  ).run(now, now)
  const insert = db.prepare(
    `INSERT INTO members (household_id, role, rank, sex, last_name, first_name, birth_date,
       address, created_at, updated_at)
     VALUES (1, 'child', ?, 'M', ?, 'Tiana', '1985-03-12', 'Ambatondrazaka', ?, ?)`
  )
  for (let i = 0; i < 60; i++) insert.run(i + 3, `NOM${String(i).padStart(2, '0')}`, now, now)
  db.close()

  const running = await launchApp({ userData })
  try {
    const w = running.window
    await navLink(w, 'Liste des fidèles, tous foyers confondus').click()
    await expect(w.getByText('60 fidèles')).toBeVisible()
    const search = w.getByRole('searchbox', { name: 'Rechercher un fidèle' })
    const list = w.getByRole('region', { name: 'Liste des fidèles' })
    const header = list.getByRole('columnheader', { name: /^Nom/ })
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
