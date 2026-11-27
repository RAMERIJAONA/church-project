/**
 * Recherche des fidèles tolérante aux fautes (porteur, 2026-11-27, approche B du spec) :
 * index en mémoire dans le process main, fonction pure, aucun accès base.
 *
 * Chaque mot tapé doit correspondre à un mot du nom ou du prénom, ou au matricule. Score par
 * mot tapé (plus petit = meilleur) : mot identique 0, début de mot 1, contenu dans un mot 2
 * (3 lettres et plus), approché 3 + distance (4 lettres et plus : 1 faute jusqu'à 7 lettres,
 * 2 à partir de 8 ; sur le début d'un mot plus long, seulement à partir de 5 lettres).
 * Matricule : identique, début ou contenu, jamais approché.
 * Ex æquo : ordre alphabétique (nom, prénom).
 */

export interface SearchEntry {
  id: number
  lastName: string
  firstName: string
  registrationNumber: string | null
}

interface IndexedEntry {
  id: number
  words: string[]
  /** Matricule normalisé sans espaces, « m0042 » ; '' si absent */
  registration: string
}

export interface SearchIndex {
  readonly entries: readonly IndexedEntry[]
}

/** Minuscules, accents retirés, toute ponctuation remplacée par une espace. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const wordsOf = (text: string): string[] => {
  const normalized = normalizeForSearch(text)
  return normalized === '' ? [] : normalized.split(' ')
}

/** Vrai si la recherche ne contient aucune lettre ni chiffre (traitée comme « pas de recherche »). */
export function isBlankQuery(query: string): boolean {
  return normalizeForSearch(query) === ''
}

const collator = new Intl.Collator('fr', { sensitivity: 'base' })

export function buildSearchIndex(rows: readonly SearchEntry[]): SearchIndex {
  const sorted = [...rows].sort(
    (a, b) =>
      collator.compare(a.lastName, b.lastName) ||
      collator.compare(a.firstName, b.firstName) ||
      a.id - b.id
  )
  return {
    entries: sorted.map((r) => ({
      id: r.id,
      words: [...wordsOf(r.lastName), ...wordsOf(r.firstName)],
      registration: wordsOf(r.registrationNumber ?? '').join('')
    }))
  }
}

/**
 * Distance de Damerau-Levenshtein restreinte (transposition de deux lettres voisines comptée
 * pour 1). Renvoie `max + 1` dès que la distance dépasse `max` (arrêt anticipé).
 */
function boundedDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prevPrev: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (prevPrev[j - 2] ?? 0) + 1)
      }
      row.push(value)
      if (value < rowMin) rowMin = value
    }
    if (rowMin > max) return max + 1
    prevPrev = prev
    prev = row
  }
  return prev[b.length] ?? max + 1
}

const NO_MATCH = Number.POSITIVE_INFINITY

function wordScore(token: string, word: string): number {
  if (word === token) return 0
  if (word.startsWith(token)) return 1
  if (token.length >= 3 && word.includes(token)) return 2
  if (token.length < 4) return NO_MATCH
  const max = token.length >= 8 ? 2 : 1
  // Début de mot approché (« rakto » → RAKOTOMALALA) seulement à partir de 5 lettres : à 4,
  // les débuts « ra… » des noms malgaches se ressemblent tous (« rako » → RASOA)
  const prefix =
    token.length >= 5 ? boundedDistance(token, word.slice(0, token.length), max) : max + 1
  const d = Math.min(boundedDistance(token, word, max), prefix)
  return d <= max ? 3 + d : NO_MATCH
}

function registrationScore(token: string, registration: string): number {
  if (registration === '') return NO_MATCH
  if (registration === token) return 0
  if (registration.startsWith(token)) return 1
  if (token.length >= 2 && registration.includes(token)) return 2
  return NO_MATCH
}

/** Ids des fidèles qui correspondent, du plus pertinent au moins pertinent. */
export function searchMembers(index: SearchIndex, query: string): number[] {
  const tokens = wordsOf(query)
  if (tokens.length === 0) return []
  const hits: Array<{ id: number; score: number; rank: number }> = []
  index.entries.forEach((entry, rank) => {
    let total = 0
    for (const token of tokens) {
      let best = registrationScore(token, entry.registration)
      for (const word of entry.words) {
        if (best === 0) break
        best = Math.min(best, wordScore(token, word))
      }
      if (best === NO_MATCH) return
      total += best
    }
    hits.push({ id: entry.id, score: total, rank })
  })
  return hits.sort((a, b) => a.score - b.score || a.rank - b.rank).map((h) => h.id)
}
