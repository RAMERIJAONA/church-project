/**
 * Liste globale des fidèles (porteur, 2026-11-27) : filtres et tri sur l'index en mémoire du
 * process main (dérogation du CLAUDE.md par. 6, étendue aux champs filtrables). Fonction pure.
 */
import type { IndexedEntry } from './members.search'
import type { ListMembersParsed, MemberSort } from './members.types'

type Compare = (a: IndexedEntry, b: IndexedEntry) => number

const byNumber =
  (key: (e: IndexedEntry) => number): Compare =>
  (a, b) =>
    key(a) - key(b)

const COMPARE: Record<Exclude<MemberSort, 'name'>, Compare[]> = {
  matricule: [byNumber((e) => e.householdNumber), byNumber((e) => e.rank)],
  // « AAAA-MM-JJ » se trie comme du texte : du plus âgé au plus jeune
  birthDate: [(a, b) => (a.birthDate < b.birthDate ? -1 : a.birthDate > b.birthDate ? 1 : 0)],
  sector: [byNumber((e) => e.sectorNumber)],
  household: [byNumber((e) => e.householdNumber)]
}

function matchesFilters(e: IndexedEntry, f: ListMembersParsed): boolean {
  return (
    (f.sectorId === undefined || e.sectorId === f.sectorId) &&
    (f.householdNumber === undefined || e.householdNumber === f.householdNumber) &&
    (f.sex === undefined || e.sex === f.sex) &&
    (f.baptized === undefined || e.baptized === f.baptized) &&
    (f.communicant === undefined || e.communicant === f.communicant) &&
    (f.deacon === undefined || e.deacon === f.deacon)
  )
}

/**
 * Ids de la liste, filtrés puis triés. `entries` est dans l'ordre alphabétique (index de
 * recherche) ; `matchedIds` : résultat d'une recherche, par pertinence, ou `null`. Avec une
 * recherche, le tri par nom garde l'ordre de pertinence ; à égalité, l'ordre alphabétique.
 */
export function filterAndSort(
  entries: readonly IndexedEntry[],
  input: ListMembersParsed,
  matchedIds: readonly number[] | null
): number[] {
  const nameRank = new Map(entries.map((e, i) => [e.id, i]))
  let rows: IndexedEntry[]
  if (matchedIds === null) rows = entries.filter((e) => matchesFilters(e, input))
  else {
    const byId = new Map(entries.map((e) => [e.id, e]))
    rows = matchedIds.flatMap((id) => {
      const e = byId.get(id)
      return e && matchesFilters(e, input) ? [e] : []
    })
  }

  if (input.sort === 'name') {
    if (matchedIds === null && input.order === 'desc') rows.reverse()
    return rows.map((e) => e.id)
  }
  const sign = input.order === 'desc' ? -1 : 1
  const keys = COMPARE[input.sort]
  const tieBreak = (a: IndexedEntry, b: IndexedEntry): number =>
    (nameRank.get(a.id) ?? 0) - (nameRank.get(b.id) ?? 0)
  return rows
    .sort((a, b) => {
      for (const cmp of keys) {
        const d = cmp(a, b)
        if (d !== 0) return sign * d
      }
      return tieBreak(a, b)
    })
    .map((e) => e.id)
}
