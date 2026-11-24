/**
 * Numérotation (Laharana) de l'arborescence comptable. Les numéros ne sont JAMAIS stockés : ils
 * découlent du rang (position) parmi les frères actifs.
 *
 * | Niveau | Forme                          | Exemple       |
 * |--------|--------------------------------|---------------|
 * | 1      | lettre malgache + rang         | `F1`          |
 * | 2      | parent + `-` + chiffre romain  | `F1-II`       |
 * | 3      | parent + `-` + chiffre         | `F1-II-1`     |
 * | 4      | parent + ` ` + lettre + `)`    | `F1-II-1 A)`  |
 */
import { MALAGASY_LETTERS } from './accounting.types'

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

/** Ordre de l'alphabet malgache : A, B, D… Z, puis AA, AB… */
export function comparePrefixes(a: string, b: string): number {
  return letterIndex(a) - letterIndex(b)
}

/** Lettre attribuée à une NOUVELLE lettre : celle qui suit la plus haute utilisée (A si aucune). */
export function nextLetter(usedPrefixes: readonly string[]): string {
  const max = usedPrefixes.reduce((m, p) => Math.max(m, letterIndex(p)), -1)
  return letterAt(max + 1)
}

/**
 * Lettres proposées pour une nouvelle rubrique de niveau 1 : les lettres déjà utilisées (pour
 * ajouter A2, A3…), puis la lettre suivante de l'alphabet malgache. Aucune autre n'est acceptée.
 */
export function availableLetters(usedPrefixes: readonly string[]): string[] {
  const used = [...new Set(usedPrefixes)].sort(comparePrefixes)
  return [...used, nextLetter(used)]
}

const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I']
]

/** 1 → « I », 14 → « XIV ». Défini de 1 à 3999. */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) {
    throw new RangeError(`Chiffre romain impossible pour ${n}`)
  }
  let rest = n
  let out = ''
  for (const [value, symbol] of ROMAN) {
    while (rest >= value) {
      out += symbol
      rest -= value
    }
  }
  return out
}

/** Niveau 1 : « F » + 1 → « F1 ». */
export function rootCode(prefix: string, rank: number): string {
  return `${prefix}${rank}`
}

/** Numéro d'un enfant selon son niveau (rang à partir de 1). */
export function childCode(parentCode: string, childLevel: 2 | 3 | 4, rank: number): string {
  switch (childLevel) {
    case 2:
      return `${parentCode}-${toRoman(rank)}`
    case 3:
      return `${parentCode}-${rank}`
    case 4:
      return `${parentCode} ${letterAt(rank - 1)})`
  }
}
