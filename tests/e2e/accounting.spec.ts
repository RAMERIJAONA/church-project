import { expect, test, type Page } from '@playwright/test'
import { launchApp, navLink, removeDir, type LaunchedApp } from './app'

const YEAR = new Date().getFullYear()

const amount = (w: Page, code: string): ReturnType<Page['getByRole']> =>
  w.getByRole('textbox', { name: `Montant ${YEAR} de ${code}` })

test('@smoke comptabilité : rubrique, lignes numérotées, montants, persistés après redémarrage', async () => {
  let running: LaunchedApp | null = await launchApp()
  const { userData } = running
  try {
    const w = running.window
    await navLink(w, 'Comptabilité').click()
    await expect(w.getByRole('heading', { level: 1, name: 'Comptabilité' })).toBeVisible()

    // Rubrique : lettre et numéro automatiques, description forcée en majuscules
    await w.getByRole('button', { name: 'Créer la première rubrique' }).click()
    await expect(w.getByRole('status', { name: 'Numéro attribué' })).toHaveText('A1')
    await w.getByLabel('Description', { exact: true }).fill('asa iombonana')
    await w.getByRole('button', { name: 'Créer la rubrique' }).click()

    // Saisie rapide des lignes : le formulaire s'ouvre seul et reste ouvert
    const desc = (code: string): ReturnType<Page['getByRole']> =>
      w.getByRole('textbox', { name: `Description de la nouvelle ligne ${code}` })
    await desc('A1-1').fill('Kitapo iombonana')
    await desc('A1-1').press('Enter')
    await w
      .getByRole('textbox', { name: `Montant ${YEAR} de la nouvelle ligne A1-1` })
      .fill('7,654,321')
    await w.keyboard.press('Enter')
    await desc('A1-2').fill('KTM - Adidy')
    await desc('A1-2').press('Enter')
    await w.keyboard.press('Enter') // sans montant
    await desc('A1-3').fill('Fanampiana Fanorenana')
    await desc('A1-3').press('Enter')
    await w.keyboard.press('Enter')
    await w.keyboard.press('Escape')

    await expect(w.getByRole('rowheader', { name: 'A1', exact: true })).toBeVisible()
    await expect(w.getByRole('button', { name: 'ASA IOMBONANA', exact: true })).toBeVisible()

    // Nouvelle lettre : B, attribuée automatiquement
    await w.getByRole('button', { name: 'Nouvelle rubrique' }).click()
    await w.getByLabel('Lettre').selectOption('B')
    await expect(w.getByRole('status', { name: 'Numéro attribué' })).toHaveText('B1')
    await w.getByLabel('Description', { exact: true }).fill('fanampiana')
    await w.getByRole('button', { name: 'Créer la rubrique' }).click()
    await expect(w.getByRole('rowheader', { name: 'B1', exact: true })).toBeVisible()
    await expect(w.getByRole('button', { name: 'FANAMPIANA', exact: true })).toBeVisible()
    await w.keyboard.press('Escape')
    await expect(amount(w, 'A1-1')).toHaveValue(/^7\s654\s321$/)
    await expect(amount(w, 'A1-2')).toHaveValue('')

    // Montant saisi directement dans le tableau
    // Montant saisi touche par touche : les espaces apparaissent pendant la frappe
    await amount(w, 'A1-2').click()
    await amount(w, 'A1-2').pressSequentially('1500000')
    await expect(amount(w, 'A1-2')).toHaveValue('1\u00a0500\u00a0000')
    await amount(w, 'A1-2').press('Enter')
    await expect(amount(w, 'A1-2')).toHaveValue(/^1\s500\s000$/)

    // Suppression : confirmation, puis renumérotation sans trou
    await w.getByRole('button', { name: 'Supprimer A1-1' }).click()
    await w.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click()
    await expect(w.getByRole('button', { name: 'KTM - Adidy' })).toBeVisible()
    await expect(w.getByRole('rowheader', { name: 'A1-3' })).toHaveCount(0)
    await expect(amount(w, 'A1-1')).toHaveValue(/^1\s500\s000$/)

    // Une autre année a ses propres montants
    await w.getByRole('button', { name: 'Année suivante' }).click()
    await expect(w.getByRole('columnheader', { name: `Montant ${YEAR + 1}` })).toBeVisible()
    await expect(w.getByRole('textbox', { name: `Montant ${YEAR + 1} de A1-1` })).toHaveValue('')

    await running.close()
    running = null

    running = await launchApp({ userData })
    const w2 = running.window
    await navLink(w2, 'Comptabilité').click()
    await expect(amount(w2, 'A1-1')).toHaveValue(/^1\s500\s000$/)
    await expect(w2.getByRole('button', { name: 'Fanampiana Fanorenana' })).toBeVisible()
  } finally {
    await running?.close()
    removeDir(userData)
  }
})
