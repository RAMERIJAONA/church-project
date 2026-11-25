import { expect, test, type Locator, type Page } from '@playwright/test'
import { launchApp, navLink, removeDir, type LaunchedApp } from './app'

const Y = new Date().getFullYear()
const localDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const TODAY = localDate(new Date())
const YESTERDAY = localDate(new Date(Date.now() - 86_400_000))
/** « 25/11/2026 » : date de saisie automatique (infobulle de la case) */
const TODAY_FR = TODAY.split('-').reverse().join('/')

const cell = (w: Page, name: string): Locator => w.getByRole('textbox', { name, exact: true })
const row = (w: Page, code: string): Locator =>
  w.locator('tr', { has: w.getByRole('rowheader', { name: code, exact: true }) })
const newChild = (w: Page, code: string): Locator =>
  w.getByRole('textbox', {
    name: `Description de la nouvelle sous-rubrique ${code}`,
    exact: true
  })

/** Choisit une date dans le calendrier du champ « Du » ou « Au ». */
async function pickDate(w: Page, field: 'Du' | 'Au', date: string): Promise<void> {
  await w.getByRole('button', { name: new RegExp(`^${field} `) }).click()
  const calendar = w.getByRole('dialog', { name: 'Choisir une date' })
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number)
  await calendar.getByLabel('Année', { exact: true }).selectOption(String(y))
  await calendar.getByLabel('Mois', { exact: true }).selectOption(String(m - 1))
  const name = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(y, m - 1, d)))
  await calendar.getByRole('button', { name, exact: true }).click()
  await expect(calendar).toHaveCount(0) // fin de l'animation de fermeture
}

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
      ['A1-1', 'Mpitandrina'],
      ['A1-2', 'Trano Fiangonana']
    ] as const) {
      await newChild(w, code).fill(description)
      await newChild(w, code).press('Enter')
    }
    await w.keyboard.press('Escape')
    await expect(w.getByRole('button', { name: 'ASA IOMBONANA', exact: true })).toBeVisible()

    // Niveau 2 : chiffres arabes tant qu'elle porte des montants, romains dès qu'elle a un enfant
    await addChildren(w, 'A1-1', [['A1-I-1', 'Karama']])
    await expect(row(w, 'A1-1')).toContainText('Trano Fiangonana') // A1-2 devient A1-1
    await addChildren(w, 'A1-1', [['A1-II-1', 'Fanatsarana']])
    await expect(row(w, 'A1-II')).toContainText('Trano Fiangonana')
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

    // Régression (2026-11-25, captures du porteur) : sous-totaux et en-têtes décalés par
    // rapport aux montants ; numéro et description pas alignés sur le champ.
    const geo = await w.evaluate(() => {
      const rowOf = (code: string): Element | undefined =>
        [...document.querySelectorAll('tbody tr')].find(
          (r) => r.querySelector('th')?.textContent === code
        )
      const textBox = (el: Element | null | undefined): DOMRect => {
        const range = document.createRange()
        if (el) range.selectNodeContents(el)
        return range.getBoundingClientRect()
      }
      const center = (r: DOMRect): number => r.top + r.height / 2
      const leaf = rowOf('A1-I-1')
      const inputBox = leaf?.querySelector('input[data-amount]')?.getBoundingClientRect()
      const box = inputBox ?? new DOMRect()
      const subtotal = rowOf('A1')?.querySelector('td:nth-of-type(2) span')
      const head = document.querySelector('th[data-amount-head]')
      const headPad = head ? parseFloat(getComputedStyle(head).paddingRight) : 0
      return {
        subtotalVsInput: (subtotal?.getBoundingClientRect().right ?? 0) - box.right,
        // En-tête : fin du texte sur « Ar » (8 px avant le bord droit du champ)
        headVsSuffix: (head?.getBoundingClientRect().right ?? 0) - headPad - (box.right - 8),
        codeVsInput: center(textBox(leaf?.querySelector('th'))) - center(box),
        descVsInput: center(textBox(leaf?.querySelector('td button'))) - center(box),
        // La date n'est plus dans le tableau (seulement dans le détail et en infobulle)
        dateInSheet: leaf?.textContent?.includes('/') ?? true,
        tooltip: leaf?.querySelector('td[title^="Dernière saisie"]')?.getAttribute('title') ?? ''
      }
    })
    expect(Math.abs(geo.subtotalVsInput)).toBeLessThanOrEqual(1)
    expect(Math.abs(geo.headVsSuffix)).toBeLessThanOrEqual(1)
    expect(Math.abs(geo.codeVsInput)).toBeLessThanOrEqual(2)
    expect(Math.abs(geo.descVsInput)).toBeLessThanOrEqual(2)
    expect(geo.dateInSheet).toBe(false)
    expect(geo.tooltip).toContain(TODAY_FR)

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
    await expect(dialog.getByText(/^Saisi le /).first()).toBeVisible()
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click()
    await expect(cell(w, `Réalisation ${Y} de A1-II-1 A)`)).toHaveCount(0)
    await expect(row(w, 'A1-II-1 A)')).toContainText(/350\s000/)

    // Sous-totaux des groupes et total général, par colonne
    await expect(row(w, 'A1-II')).toContainText(/350\s000/)
    for (const code of ['A1', 'Total général']) {
      await expect(row(w, code)).toContainText(/500\s000/)
      await expect(row(w, code)).toContainText(/770\s000/)
      await expect(row(w, code)).toContainText(/600\s000/)
    }

    // Montants en Ariary ; date et heure de saisie : dans le détail (pas dans le tableau)
    await expect(row(w, 'A1-II-1 A)')).toContainText(/350\s000\sAr/)

    // Synthèse : total des réalisations du jour, de la semaine, du mois et de l'année
    for (const title of ['Aujourd’hui', 'Cette semaine', 'Ce mois', 'Cette année']) {
      await expect(
        w.getByRole('button', { name: new RegExp(`^${title} : 770\\s000\\sAr$`) })
      ).toBeVisible()
    }
    await w.getByRole('button', { name: /^Ce mois :/ }).click()
    await expect(w.getByRole('button', { name: 'Mois', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await w.getByRole('button', { name: 'Année', exact: true }).click()

    // Vues par période : réalisations par date d'opération (aujourd'hui par défaut), lecture seule
    const view = (name: string): Locator => w.getByRole('button', { name, exact: true })
    for (const name of ['Mois', 'Semaine', 'Jour']) {
      await view(name).click()
      await expect(view(name)).toHaveAttribute('aria-pressed', 'true')
      await expect(row(w, 'A1-I-1')).toContainText(/420\s000/)
      await expect(row(w, 'A1-II-1 A)')).toContainText(/350\s000/)
      await expect(w.getByRole('textbox')).toHaveCount(0)
      await expect(row(w, 'Total')).toContainText(/770\s000/)
    }
    await w.getByRole('button', { name: 'Période précédente' }).click()
    await expect(w.getByText('Aucune réalisation sur cette période.')).toBeVisible()
    await expect(row(w, 'A1-I-1')).not.toContainText(/420/)
    await w.getByRole('button', { name: 'Revenir à aujourd’hui' }).click()
    await expect(row(w, 'A1-I-1')).toContainText(/420\s000/)
    // Période personnalisée : Du / Au avec le calendrier natif
    await view('Personnalisé').click()
    await pickDate(w, 'Du', `${Y}-01-01`)
    await pickDate(w, 'Au', TODAY)
    await expect(row(w, 'Total')).toContainText(/770\s000/)
    await pickDate(w, 'Du', YESTERDAY) // l'autre borne suit si besoin
    await pickDate(w, 'Au', YESTERDAY)
    await expect(w.getByText('Aucune réalisation sur cette période.')).toBeVisible()

    await view('Année').click()
    await expect(cell(w, `Réalisation ${Y} de A1-I-1`)).toHaveValue(/^420\s000$/)

    // Impression : seul le tableau et son en-tête s'impriment
    await expect(w.getByRole('button', { name: 'Imprimer' })).toBeVisible()
    await w.emulateMedia({ media: 'print' })
    await expect(w.getByRole('button', { name: 'Imprimer' })).toBeHidden()
    await expect(w.getByRole('heading', { name: /: comptabilité$/ })).toBeVisible()
    await expect(w.getByRole('button', { name: 'Actions de A1', exact: true })).toBeHidden()
    await expect(row(w, 'Total général')).toContainText(/770\s000/)
    // Demandes du porteur (2026-11-25) : tout fond en blanc, pas d'icône « ↳ », « Ar » du total
    // général en gras comme le chiffre
    const printed = await w.evaluate(() => {
      const colored = [...document.querySelectorAll<HTMLElement>('body *')].filter((el) => {
        const bg = getComputedStyle(el).backgroundColor
        return el.offsetParent !== null && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent'
      })
      const connectors = [...document.querySelectorAll('svg[data-print="hide"]')].filter(
        (el) => getComputedStyle(el).display !== 'none'
      )
      const mark = document.querySelector('tfoot td span span')
      // « Ar » de chaque montant affiché : même graisse que son chiffre
      const lighter = [...document.querySelectorAll<HTMLElement>('td span > span')].filter(
        (m) =>
          m.parentElement !== null &&
          getComputedStyle(m).fontWeight !== getComputedStyle(m.parentElement).fontWeight
      )
      return {
        lighterMarks: lighter.length,
        colored: colored.slice(0, 3).map((el) => el.tagName + '.' + el.className),
        connectors: connectors.length,
        markWeight: mark ? Number(getComputedStyle(mark).fontWeight) : 0
      }
    })
    expect(printed.colored).toEqual([])
    expect(printed.connectors).toBe(0)
    expect(printed.markWeight).toBeGreaterThanOrEqual(600)
    expect(printed.lighterMarks).toBe(0)
    await w.emulateMedia({ media: 'screen' })

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
    await w.getByRole('button', { name: 'Actions de A1-I', exact: true }).click()
    await w.getByRole('button', { name: 'Supprimer A1-I', exact: true }).click()
    await w.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click()
    await expect(w.getByRole('button', { name: 'Mpitandrina', exact: true })).toHaveCount(0)
    await expect(row(w, 'A1-I')).toContainText('Trano Fiangonana')
    await expect(row(w, 'A1-I-1 A)')).toContainText(/350\s000/)
    await expect(row(w, 'Total général')).toContainText(/350\s000/)
    await expect(row(w, 'Total général')).not.toContainText(/770/)

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
