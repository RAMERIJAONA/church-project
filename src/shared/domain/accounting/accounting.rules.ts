/**
 * Règles pures de numérotation (Laharana). Les numéros ne sont JAMAIS stockés : ils découlent
 * de l'ordre (`position`) des éléments non supprimés. Conséquences voulues :
 * - pas de trou après une suppression (A1-1, A1-2, A1-3 → suppression de A1-2 → A1-1, A1-2) ;
 * - déplacer une ligne renumérote ses voisines ;
 * - les montants suivent la ligne (liés à son identifiant, pas à son numéro).
 */
import {
  MALAGASY_LETTERS,
  type AccountingSectionDTO,
  type AccountingSheetDTO
} from './accounting.types'

export interface SectionRow {
  id: number
  prefix: string
  position: number
  description: string
}

export interface LineRow {
  id: number
  sectionId: number
  position: number
  description: string
}

export interface AmountRow {
  lineId: number
  amount: number
}

/** « a » → « A ». La validation (alphabet malgache) est faite par `sectionPrefixSchema`. */
export function normalizePrefix(prefix: string): string {
  return prefix.trim().toUpperCase()
}

/** « asa iombonana » → « ASA IOMBONANA » (les rubriques sont toujours en majuscules). */
export function normalizeSectionDescription(description: string): string {
  return description.trim().toUpperCase()
}

const BASE = MALAGASY_LETTERS.length

/** Rang (0, 1, 2…) → lettre : A, B, D… Z, puis AA, AB, AD… (numérotation bijective en base 21). */
export function letterAt(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const r = (n - 1) % BASE
    out = MALAGASY_LETTERS[r] + out
    n = Math.floor((n - 1) / BASE)
  }
  return out
}

/** Inverse de `letterAt`. -1 si ce n'est pas une lettre de l'alphabet malgache. */
export function letterIndex(letter: string): number {
  let n = 0
  for (const ch of letter) {
    const i = (MALAGASY_LETTERS as readonly string[]).indexOf(ch)
    if (i < 0) return -1
    n = n * BASE + i + 1
  }
  return letter.length === 0 ? -1 : n - 1
}

/** Lettre attribuée à une NOUVELLE lettre : celle qui suit la plus haute utilisée (A si aucune). */
export function nextLetter(usedPrefixes: readonly string[]): string {
  const max = usedPrefixes.reduce((m, p) => Math.max(m, letterIndex(p)), -1)
  return letterAt(max + 1)
}

/**
 * Lettres proposées pour une nouvelle rubrique : les lettres déjà utilisées (pour ajouter A2,
 * A3…), puis la lettre suivante de l'alphabet malgache. Aucune autre n'est acceptée.
 */
export function availableLetters(usedPrefixes: readonly string[]): string[] {
  const used = [...new Set(usedPrefixes)].sort(comparePrefixes)
  return [...used, nextLetter(used)]
}

export function sectionCode(prefix: string, rank: number): string {
  return `${prefix}${rank}`
}

export function lineCode(parentCode: string, rank: number): string {
  return `${parentCode}-${rank}`
}

/** Ordre de l'alphabet malgache : A, B, D… Z, puis AA, AB… */
export function comparePrefixes(a: string, b: string): number {
  return letterIndex(a) - letterIndex(b)
}

const byPosition = (
  a: { position: number; id: number },
  b: { position: number; id: number }
): number => a.position - b.position || a.id - b.id

/**
 * Construit le tableau d'une année : rubriques triées par lettre puis par position, numérotées
 * par lettre (A1, A2, B1…) ; lignes triées par position, numérotées dans leur rubrique.
 * Les lignes dont la rubrique est absente sont ignorées.
 */
export function buildSheet(
  year: number,
  sections: readonly SectionRow[],
  lines: readonly LineRow[],
  amounts: readonly AmountRow[]
): AccountingSheetDTO {
  const amountByLine = new Map(amounts.map((a) => [a.lineId, a.amount]))
  const linesBySection = new Map<number, LineRow[]>()
  for (const line of lines) {
    const list = linesBySection.get(line.sectionId)
    if (list) list.push(line)
    else linesBySection.set(line.sectionId, [line])
  }

  const sorted = [...sections].sort(
    (a, b) => comparePrefixes(a.prefix, b.prefix) || byPosition(a, b)
  )
  const rankByPrefix = new Map<string, number>()

  const result: AccountingSectionDTO[] = sorted.map((s) => {
    const rank = (rankByPrefix.get(s.prefix) ?? 0) + 1
    rankByPrefix.set(s.prefix, rank)
    const code = sectionCode(s.prefix, rank)
    const children = [...(linesBySection.get(s.id) ?? [])].sort(byPosition)
    return {
      id: s.id,
      prefix: s.prefix,
      code,
      description: s.description,
      lines: children.map((l, i) => ({
        id: l.id,
        code: lineCode(code, i + 1),
        description: l.description,
        amount: amountByLine.get(l.id) ?? null
      }))
    }
  })
  return { year, sections: result }
}

/** Numéro qu'aura la prochaine rubrique de cette lettre (aperçu avant création). */
export function nextSectionCode(
  prefix: string,
  sections: ReadonlyArray<Pick<AccountingSectionDTO, 'prefix'>>
): string {
  const p = normalizePrefix(prefix)
  return sectionCode(p, sections.filter((s) => s.prefix === p).length + 1)
}

/** Numéro qu'aura la prochaine ligne de cette rubrique (aperçu avant création). */
export function nextLineCode(section: Pick<AccountingSectionDTO, 'code' | 'lines'>): string {
  return lineCode(section.code, section.lines.length + 1)
}
