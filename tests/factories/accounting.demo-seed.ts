/**
 * Grand jeu de données de démonstration (`npm run seed:accounting`) : le plan fictif
 * `tests/fixtures/accounting/demo-plan.ts`, des montants en Ariary sur 6 années (4 passées,
 * l'année en cours, l'année prochaine), générés de façon DÉTERMINISTE (hasard à graine fixe).
 * Passe par le service : toutes les règles de l'application s'appliquent.
 *
 * Ce qu'il permet de tester :
 * - vue Année sur chaque année (◀ ▶), 3 colonnes, sous-totaux, total général, cartes de totaux ;
 * - vues Jour / Semaine / Mois / Personnalisé : réalisations datées (dimanches surtout, et des
 *   jours de semaine), y compris aujourd'hui et cette semaine ;
 * - cases simples (une saisie sans libellé) et détaillées (2 à 7 saisies avec libellé) ;
 * - saisies modifiées (« modifié le »), supprimées, et saisies tardives faites après la fin de
 *   leur année (affichées « Saisi après 2025 ») ;
 * - deux comptabilités : entrées (A2, A3, B2…) et sorties (A1, B1…) ;
 * - rubriques vides, rubrique principale à montants (J1 des sorties), très grands montants
 *   (K1), description longue (retour à la ligne), section supprimée (renumérotation) ;
 * - impression sur plusieurs pages.
 */
import type { AccountingService } from '@main/services/accounting.service'
import { periodRange, shiftPeriod } from '@shared/domain/accounting/accounting.periods'
import type { AccountingItemDTO, EntryType } from '@shared/domain/accounting/accounting.types'
import { DEMO_PLAN, type DemoNode, type DemoRoot } from '@tests/fixtures/accounting/demo-plan'

export interface DemoSeedSummary {
  items: number
  entries: number
  /** Années couvertes (estimations), réalisations jusqu'à aujourd'hui */
  years: [number, number]
  detailedCells: number
  lateEntries: number
  modifiedEntries: number
  deletedEntries: number
}

type SettableClock = (() => Date) & { set(date: Date): void }

const ENTRY_LABELS = [
  'Quête du culte',
  'Versement en espèces',
  'Virement bancaire',
  'Facture fournisseur',
  'Reçu n° 0142',
  'Don anonyme',
  'Avance au trésorier',
  'Mobile money',
  'Chèque',
  'Complément'
]

/** Hasard déterministe (mulberry32) : même base à chaque lancement pour un même jour. */
function random(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Montant en Ariary arrondi à 500 Ar (au moins 500). */
const ariary = (value: number): number => Math.max(500, Math.round(value / 500) * 500)

const pad = (n: number): string => String(n).padStart(2, '0')

/** Instant de saisie : date du calendrier + heure de bureau variable (UTC, Madagascar = +3). */
const instant = (date: string, minuteOfDay: number): Date =>
  new Date(
    `${date}T${pad(5 + (Math.floor(minuteOfDay / 60) % 10))}:${pad(minuteOfDay % 60)}:00.000Z`
  )

/**
 * @param today date locale du jour (« AAAA-MM-JJ ») : les réalisations de l'année en cours
 *   s'arrêtent à aujourd'hui, et quelques-unes tombent aujourd'hui et cette semaine.
 */
export function seedDemo(
  service: AccountingService,
  clock: SettableClock,
  today: string
): DemoSeedSummary {
  const rand = random(20261125)
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T
  const currentYear = Number(today.slice(0, 4))
  const firstYear = currentYear - 4
  const lastYear = currentYear + 1
  const summary: DemoSeedSummary = {
    items: 0,
    entries: 0,
    years: [firstYear, lastYear],
    detailedCells: 0,
    lateEntries: 0,
    modifiedEntries: 0,
    deletedEntries: 0
  }
  // Lundi de cette semaine, ramené au 1er janvier si la semaine commence l'année précédente
  const weekStart = [periodRange('week', today).from, `${currentYear}-01-01`].sort()[1] ?? today
  let leafRank = 0
  /** Jamais d'instant de saisie dans le futur */
  const notAfterToday = (date: string): string => (date > today ? today : date)

  const add = (
    itemId: number,
    year: number,
    type: EntryType,
    amount: number,
    label: string | null,
    operatedOn: string | null,
    createdAt: Date
  ): number => {
    clock.set(createdAt)
    summary.entries++
    return service.addEntry({ itemId, year, type, amount, label, operatedOn }).id
  }

  /** Date de réalisation dans l'année, jamais après aujourd'hui : dimanche, parfois un mardi. */
  const actualDate = (year: number): string => {
    const last = year === currentYear ? today : `${year}-12-31`
    const days = Math.max(
      0,
      (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${year}-01-01T00:00:00Z`)) / 86_400_000
    )
    const date = shiftPeriod('day', `${year}-01-01`, Math.floor(rand() * (days + 1)))
    const sunday = periodRange('week', date).to
    const preferred = rand() < 0.7 ? sunday : date
    return preferred <= last && preferred.startsWith(String(year)) ? preferred : date
  }

  const actuals = (itemId: number, year: number, total: number, rank: number): void => {
    const parts = rank % 5 < 2 ? 1 : 2 + Math.floor(rand() * 6)
    if (parts > 1) summary.detailedCells++
    const share = Math.floor(total / parts)
    const ids: number[] = []
    const dates: string[] = []
    for (let j = 0; j < parts; j++) {
      // Quelques saisies tombent aujourd'hui et cette semaine (cartes et vues Jour / Semaine)
      const date =
        year === currentYear && rank % 7 === 0 && j === 0
          ? today
          : year === currentYear && rank % 7 === 1 && j === 0
            ? weekStart
            : actualDate(year)
      dates.push(date)
      const amount = j === parts - 1 ? total - share * (parts - 1) : share
      const label = parts > 1 ? `${pick(ENTRY_LABELS)} (${j + 1}/${parts})` : null
      ids.push(add(itemId, year, 'actual', amount, label, date, instant(date, rank * 37 + j * 11)))
    }
    const first = ids[0]
    const firstDate = dates[0]
    if (parts > 1 && first !== undefined && firstDate !== undefined && rank % 3 === 0) {
      // Corrigée quelques jours plus tard (sans dépasser aujourd'hui) : « modifié le »
      clock.set(instant(notAfterToday(shiftPeriod('day', firstDate, 3)), 600 + rank))
      service.updateEntry({ id: first, amount: ariary(share * 1.05), label: 'Montant corrigé' })
      summary.modifiedEntries++
    }
    if (parts > 3 && ids[1] !== undefined && rank % 4 === 0) {
      // Saisie annulée (suppression douce) : n'apparaît nulle part
      service.deleteEntry(ids[1])
      summary.deletedEntries++
    }
  }

  /** `always` : aucune année laissée vide (J1, K1 : cas à tester à coup sûr) */
  const amounts = (itemId: number, scale: number, always = false): void => {
    const rank = leafRank++
    for (let year = firstYear; year <= lastYear; year++) {
      if (!always && rand() < 0.08) continue // année sans montant : cases vides
      const growth = 1 + 0.06 * (year - firstYear)
      const estimate = ariary(scale * growth * (0.9 + rand() * 0.2))
      // Budget voté en novembre de l'année précédente
      const voted = instant(notAfterToday(`${year - 1}-11-15`), rank * 13)
      add(itemId, year, 'estimate', estimate, null, null, voted)
      if (year > currentYear) continue
      const ratio = year < currentYear ? 0.6 + rand() * 0.55 : (0.6 + rand() * 0.4) * 0.9
      actuals(itemId, year, ariary(estimate * ratio), rank)
      if (year === currentYear - 1 && rank % 9 === 4) {
        // Saisie tardive, faite en janvier pour l'année écoulée : « Saisi après … »
        const createdAt = instant(notAfterToday(`${currentYear}-01-${pad(5 + (rank % 20))}`), rank)
        add(
          itemId,
          year,
          'actual',
          ariary(scale * 0.05),
          'Régularisation',
          `${year}-12-31`,
          createdAt
        )
        summary.lateEntries++
      }
    }
  }

  const create = (node: DemoNode, parentId: number): void => {
    const { d, c, scale, empty } = typeof node === 'string' ? { d: node } : node
    const { id } = service.createItem({ parentId, description: d })
    summary.items++
    if (c?.length) for (const child of c) create(child, id)
    else if (!empty) amounts(id, scale ?? Math.exp(Math.log(50_000) + rand() * Math.log(400)))
  }

  const createRoot = (root: DemoRoot): number => {
    const { id } = service.createItem({
      parentId: null,
      ledger: root.ledger,
      prefix: root.prefix,
      description: root.d
    })
    summary.items++
    if (root.c?.length) for (const child of root.c) create(child, id)
    else amounts(id, root.scale ?? 1_000_000, true)
    return id
  }

  clock.set(instant(`${firstYear - 1}-11-01`, 0))
  const toDelete: number[] = []
  for (const root of DEMO_PLAN) {
    const id = createRoot(root)
    if (root.deleted) toDelete.push(id)
  }
  // Supprimées à la fin, une fois les suivantes créées : elles sont renumérotées (A3 → A2)
  for (const id of toDelete) service.deleteItem(id)
  summary.items =
    countItems(service.getSheet(currentYear, 'expense').items) +
    countItems(service.getSheet(currentYear, 'income').items)
  return summary
}

const countItems = (items: readonly AccountingItemDTO[]): number =>
  items.reduce((n, i) => n + 1 + countItems(i.children), 0)
