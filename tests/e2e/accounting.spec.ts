import { expect, test, type Locator, type Page } from '@playwright/test'
import { launchApp, navLink, removeDir, type LaunchedApp } from './app'

const Y = new Date().getFullYear()

const cell = (w: Page, name: string): Locator => w.getByRole('textbox', { name, exact: true })
const row = (w: Page, code: string): Locator =>
  w.locator('tr', { has: w.getByRole('rowheader', { name: code, exact: true }) })
const newChild = (w: Page, code: string): Locator =>
  w.getByRole('textbox', {
    name: `Description de la nouvelle sous-rubrique ${code}`,
    exact: true
  })

/** Ajoute des sous-rubriques à la suite (le formulaire reste ouvert), puis le ferme. */
async function addChildren(w: Page, parent: string, items: Array<[string, string]>): Promise<void> {
  await w
    .getByRole('button', { name: `Ajouter une sous-rubrique à ${parent}`, exact: true })
    .click()
  for (const [code, description] of items) {
    await newChild(w, code).fill(description)
    await newChild(w, code).press('Enter')
  }
  await w.keyboard.press('Escape')
}

test('@smoke comptabilité : arborescence, 3 colonnes, détail, persistés après redémarrage', async () => {
  let running: LaunchedApp | null = await launchApp()
  const { userData } = running
  try {
    const w = running.window
    await navLink(w, 'Comptabilité').click()
    await expect(w.getByRole('heading', { level: 1, name: 'Comptabilité' })).toBeVisible()

    // Niveau 1 : lettre et numéro automatiques, majuscules ; on enchaîne sur les sous-rubriques
    await w.getByRole('button', { name: 'Créer la première rubrique' }).click()
    await expect(w.getByRole('status', { name: 'Numéro attribué' })).toHaveText('A1')
    await w.getByLabel('Description', { exact: true }).fill('asa iombonana')
    await w.getByRole('button', { name: 'Créer la rubrique' }).click()
    for (const [code, description] of [
      ['A1-I', 'Mpitandrina'],
      ['A1-II', 'Trano Fiangonana']
    ] as const) {
      await newChild(w, code).fill(description)
      await newChild(w, code).press('Enter')
    }
    await w.keyboard.press('Escape')
    await expect(w.getByRole('button', { name: 'ASA IOMBONANA', exact: true })).toBeVisible()

    await addChildren(w, 'A1-I', [['A1-I-1', 'Karama']])
    await addChildren(w, 'A1-II', [['A1-II-1', 'Fanatsarana']])
    await addChildren(w, 'A1-II-1', [
      ['A1-II-1 A)', 'Trano Fiangonana (Kojakoja)'],
      ['A1-II-1 B)', 'Akany']
    ])
    await expect(row(w, 'A1-II-1 B)')).toBeVisible()

    // 3 colonnes : Entrée passe à la case suivante ; groupement par 3 pendant la frappe
    await cell(w, `Estimation ${Y} de A1-I-1`).click()
    await w.keyboard.type('500000')
    await expect(cell(w, `Estimation ${Y} de A1-I-1`)).toHaveValue('500 000')
    await w.keyboard.press('Enter')
    await w.keyboard.type('420000')
    await w.keyboard.press('Enter')
    await w.keyboard.type('600000')
    await w.keyboard.press('Enter')
    await expect(cell(w, `Réalisation ${Y} de A1-I-1`)).toHaveValue(/^420\s000$/)
    await expect(cell(w, `Estimation ${Y + 1} de A1-I-1`)).toHaveValue(/^600\s000$/)
    // Un groupe n'a pas de case de montant
    await expect(cell(w, `Réalisation ${Y} de A1-II-1`)).toHaveCount(0)

    // Détail : saisies avec libellé, la case devient une somme en lecture seule
    await w.getByRole('button', { name: `Détail : Réalisation ${Y} de A1-II-1 A)` }).click()
    const dialog = w.getByRole('dialog', { name: `Réalisation ${Y} de A1-II-1 A)` })
    for (const [label, amount] of [
      ['Kojakoja', '250000'],
      ['Fanatsarana', '100000']
    ] as const) {
      await dialog.getByLabel('Libellé de la nouvelle saisie').fill(label)
      await dialog.getByLabel('Montant de la nouvelle saisie').fill(amount)
      await dialog.getByLabel('Montant de la nouvelle saisie').press('Enter')
      await expect(dialog.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(dialog.getByText(/Total : 350\s000/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click()
    await expect(cell(w, `Réalisation ${Y} de A1-II-1 A)`)).toHaveCount(0)
    await expect(row(w, 'A1-II-1 A)')).toContainText(/350\s000/)

    // Vues par période : réalisations par date d'opération (aujourd'hui par défaut), lecture seule
    const view = (name: string): Locator => w.getByRole('button', { name, exact: true })
    for (const name of ['Mois', 'Semaine', 'Jour']) {
      await view(name).click()
      await expect(view(name)).toHaveAttribute('aria-pressed', 'true')
      await expect(row(w, 'A1-I-1')).toContainText(/420\s000/)
      await expect(row(w, 'A1-II-1 A)')).toContainText(/350\s000/)
      await expect(w.getByRole('textbox')).toHaveCount(0)
    }
    await w.getByRole('button', { name: 'Période précédente' }).click()
    await expect(w.getByText('Aucune réalisation sur cette période.')).toBeVisible()
    await expect(row(w, 'A1-I-1')).not.toContainText(/420/)
    await w.getByRole('button', { name: 'Revenir à aujourd’hui' }).click()
    await expect(row(w, 'A1-I-1')).toContainText(/420\s000/)
    await view('Année').click()
    await expect(cell(w, `Réalisation ${Y} de A1-I-1`)).toHaveValue(/^420\s000$/)

    // Une rubrique qui a des montants ne reçoit pas de sous-rubrique
    await expect(
      w.getByRole('button', { name: 'Ajouter une sous-rubrique à A1-I-1' })
    ).toBeDisabled()

    // Estimation N+1 de cette année = estimation de l'année suivante
    await w.getByRole('button', { name: 'Année suivante' }).click()
    await expect(cell(w, `Estimation ${Y + 1} de A1-I-1`)).toHaveValue(/^600\s000$/)
    await expect(cell(w, `Réalisation ${Y + 1} de A1-I-1`)).toHaveValue('')
    await w.getByRole('button', { name: 'Année précédente' }).click()

    // Suppression d'un groupe : confirmation, descendance retirée, renumérotation
    await w.getByRole('button', { name: 'Supprimer A1-I', exact: true }).click()
    await w.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click()
    await expect(w.getByRole('button', { name: 'Mpitandrina', exact: true })).toHaveCount(0)
    await expect(row(w, 'A1-I')).toContainText('Trano Fiangonana')
    await expect(row(w, 'A1-I-1 A)')).toContainText(/350\s000/)

    await running.close()
    running = null

    running = await launchApp({ userData })
    const w2 = running.window
    await navLink(w2, 'Comptabilité').click()
    await expect(row(w2, 'A1-I-1 A)')).toContainText(/350\s000/)
    await w2.getByRole('button', { name: `Détail : Réalisation ${Y} de A1-I-1 A)` }).click()
    const detail = w2.getByRole('dialog', { name: `Réalisation ${Y} de A1-I-1 A)` })
    await expect(detail.getByText('Kojakoja', { exact: true })).toBeVisible()

    // Suppression d'une saisie : confirmation par-dessus le détail, qui reste ouvert
    await detail.getByRole('button', { name: 'Supprimer la saisie Fanatsarana' }).click()
    await w2.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click()
    await expect(detail.getByText('Fanatsarana', { exact: true })).toHaveCount(0)
    await expect(detail.getByText(/Total : 250\s000/)).toBeVisible()
    await w2.keyboard.press('Escape')
    await expect(row(w2, 'A1-I-1 A)')).toContainText(/250\s000/)
  } finally {
    await running?.close()
    removeDir(userData)
  }
})
