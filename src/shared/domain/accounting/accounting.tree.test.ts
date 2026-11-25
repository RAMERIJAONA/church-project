import { describe, expect, it } from 'vitest'
import {
  buildSheet,
  countDescendants,
  findItem,
  nextChildCode,
  type EntryRow,
  type ItemRow
} from './accounting.tree'

const item = (o: Partial<ItemRow> & Pick<ItemRow, 'id'>): ItemRow => ({
  parentId: null,
  prefix: null,
  position: o.id,
  description: `Élément ${o.id}`,
  ...o
})

/** Exemple de l'église : F1 > {F1-I > F1-I-1, F1-II > F1-II-1 > {A), B)}} */
const church: ItemRow[] = [
  item({ id: 1, prefix: 'F', description: 'ANATINY' }),
  item({ id: 2, parentId: 1, description: 'Mpitandrina' }),
  item({ id: 3, parentId: 2, description: 'Karama' }),
  item({ id: 4, parentId: 1, description: 'Trano Fiangonana' }),
  item({ id: 5, parentId: 4, description: 'Fanatsarana' }),
  item({ id: 6, parentId: 5, description: 'Trano Fiangonana (Kojakoja)' }),
  item({ id: 7, parentId: 5, description: 'Akany' })
]

const flat = (sheet: ReturnType<typeof buildSheet>): Array<[string, number]> => {
  const out: Array<[string, number]> = []
  const walk = (items: typeof sheet.items): void =>
    items.forEach((i) => {
      out.push([i.code, i.level])
      walk(i.children)
    })
  walk(sheet.items)
  return out
}

describe('buildSheet : arborescence', () => {
  it('construit l’arbre de l’exemple de l’église avec ses numéros', () => {
    expect(flat(buildSheet(2026, church, [], new Set()))).toEqual([
      ['F1', 1],
      ['F1-I', 2],
      ['F1-I-1', 3],
      ['F1-II', 2],
      ['F1-II-1', 3],
      ['F1-II-1 A)', 4],
      ['F1-II-1 B)', 4]
    ])
  })

  it('ne donne pas de montants aux groupes', () => {
    const sheet = buildSheet(2026, church, [], new Set())
    for (const id of [1, 2, 4, 5]) expect(findItem(sheet, id)?.amounts, String(id)).toBeNull()
    for (const id of [3, 6, 7]) expect(findItem(sheet, id)?.amounts, String(id)).not.toBeNull()
  })

  it('donne des montants à une rubrique principale sans sous-rubrique', () => {
    const sheet = buildSheet(
      2026,
      [item({ id: 9, prefix: 'A' })],
      [
        {
          itemId: 9,
          year: 2026,
          type: 'actual',
          amount: 1000,
          label: null,
          updatedAt: '2026-11-20T08:00:00.000Z'
        }
      ],
      new Set([9])
    )
    expect(sheet.items[0]?.amounts?.actual.total).toBe(1000)
    expect(sheet.items[0]?.canAddChild).toBe(false)
  })

  it('remplit Estimation N+1 avec l’estimation de l’année suivante', () => {
    const entries: EntryRow[] = [
      {
        itemId: 3,
        year: 2027,
        type: 'estimate',
        amount: 600000,
        label: null,
        updatedAt: '2026-11-20T08:00:00.000Z'
      },
      {
        itemId: 3,
        year: 2026,
        type: 'actual',
        amount: 420000,
        label: null,
        updatedAt: '2026-11-20T08:00:00.000Z'
      },
      {
        itemId: 3,
        year: 2026,
        type: 'actual',
        amount: 80000,
        label: 'Bonus',
        updatedAt: '2026-11-25T11:32:00.000Z'
      }
    ]
    const amounts = findItem(buildSheet(2026, church, entries, new Set([3])), 3)?.amounts
    expect(amounts?.nextEstimate).toEqual({
      total: 600000,
      entryCount: 1,
      detailed: false,
      lastEntryAt: '2026-11-20T08:00:00.000Z'
    })
    expect(amounts?.estimate).toEqual({
      total: null,
      entryCount: 0,
      detailed: false,
      lastEntryAt: null
    })
    expect(amounts?.actual).toEqual({
      total: 500000,
      entryCount: 2,
      detailed: true,
      lastEntryAt: '2026-11-25T11:32:00.000Z'
    })
  })

  it('interdit d’ajouter un enfant à un élément qui a des saisies, même d’une autre année', () => {
    const sheet = buildSheet(2026, church, [], new Set([3]))
    expect(findItem(sheet, 3)?.canAddChild).toBe(false)
    expect(findItem(sheet, 6)?.canAddChild).toBe(false) // niveau 4
    expect(findItem(sheet, 2)?.canAddChild).toBe(true)
    expect(findItem(sheet, 1)?.canAddChild).toBe(true)
  })

  it('renumérote sans trou selon la position', () => {
    const rows = [
      item({ id: 1, prefix: 'A' }),
      item({ id: 12, parentId: 1, position: 9 }),
      item({ id: 10, parentId: 1, position: 1 }),
      item({ id: 11, parentId: 1, position: 5 })
    ]
    expect(
      buildSheet(2026, rows, [], new Set()).items[0]?.children.map((c) => [c.id, c.code])
    ).toEqual([
      [10, 'A1-1'],
      [11, 'A1-2'],
      [12, 'A1-3']
    ])
  })

  it('numérote le niveau 1 par lettre, dans l’ordre de l’alphabet malgache', () => {
    const rows = [
      item({ id: 1, prefix: 'B' }),
      item({ id: 2, prefix: 'AA' }),
      item({ id: 3, prefix: 'A' }),
      item({ id: 4, prefix: 'B' })
    ]
    expect(buildSheet(2026, rows, [], new Set()).items.map((i) => i.code)).toEqual([
      'A1',
      'B1',
      'B2',
      'AA1'
    ])
  })

  it('ignore les éléments dont le parent est absent et ceux au-delà du niveau 4', () => {
    const rows = [
      ...church,
      item({ id: 20, parentId: 99 }),
      item({ id: 21, parentId: 6 }) // sous un niveau 4
    ]
    const sheet = buildSheet(2026, rows, [], new Set())
    expect(findItem(sheet, 20)).toBeUndefined()
    expect(findItem(sheet, 21)).toBeUndefined()
    expect(findItem(sheet, 6)?.amounts).not.toBeNull()
  })

  it('compte la descendance d’un élément', () => {
    const sheet = buildSheet(2026, church, [], new Set())
    expect(countDescendants(findItem(sheet, 1)!)).toBe(6)
    expect(countDescendants(findItem(sheet, 5)!)).toBe(2)
    expect(countDescendants(findItem(sheet, 7)!)).toBe(0)
  })

  it('au niveau 2, numérote les groupes et les rubriques à montant séparément', () => {
    const rows = [
      item({ id: 1, prefix: 'F' }),
      item({ id: 2, parentId: 1 }), // groupe (a un enfant)
      item({ id: 3, parentId: 1 }), // rubrique à montant
      item({ id: 4, parentId: 1 }), // groupe
      item({ id: 5, parentId: 1 }), // rubrique à montant
      item({ id: 6, parentId: 2 }),
      item({ id: 7, parentId: 4 })
    ]
    const sheet = buildSheet(2026, rows, [], new Set())
    expect(sheet.items[0]?.children.map((c) => c.code)).toEqual(['F1-I', 'F1-1', 'F1-II', 'F1-2'])
    expect(findItem(sheet, 7)?.code).toBe('F1-II-1')
  })

  it('propose le numéro d’un nouvel enfant, parent renuméroté compris', () => {
    const rows = [
      item({ id: 1, prefix: 'A' }),
      item({ id: 2, parentId: 1 }),
      item({ id: 3, parentId: 1 }),
      item({ id: 4, parentId: 3 })
    ]
    const sheet = buildSheet(2026, rows, [], new Set())
    expect(sheet.items[0]?.children.map((c) => c.code)).toEqual(['A1-1', 'A1-I'])
    expect(nextChildCode(sheet, 1)).toBe('A1-2')
    expect(nextChildCode(sheet, 3)).toBe('A1-I-2')
    // A1-1 deviendrait un groupe placé avant A1-I : il prendrait A1-I (l'actuel passerait A1-II)
    expect(nextChildCode(sheet, 2)).toBe('A1-I-1')
    expect(nextChildCode(sheet, 999)).toBeNull()
  })
})
