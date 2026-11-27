/**
 * Numérotation (Laharana) de l'arborescence comptable. Les numéros ne sont JAMAIS stockés : ils
 * découlent du rang (position) parmi les frères actifs.
 *
 * | Niveau | Forme                          | Exemple       |
 * |--------|--------------------------------|---------------|
 * | 1      | lettre malgache + 1 (sorties)  | `F1`          |
 * |        | ou + 2 (entrées), sans trou    | `F2`          |
 * | 2      | parent + `-` + romain          | `F1-II`       |
 * |        | (arabe si aucune sœur groupe)  | `A1-2`        |
 * | 3      | parent + `-` + chiffre         | `F1-II-1`     |
 * | 4      | parent + ` ` + lettre + `)`    | `F1-II-1 A)`  |
 */
import { toRoman } from '@shared/utils/roman'
import { MALAGASY_LETTERS, type Ledger } from './accounting.types'

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

/**
 * Lettre de la prochaine rubrique de niveau 1 : celle qui suit la plus haute utilisée (A si
 * aucune). Une lettre ne sert qu'une fois par comptabilité (règle du porteur, 2026-11-25).
 */
export function nextLetter(usedPrefixes: readonly string[]): string {
  const max = usedPrefixes.reduce((m, p) => Math.max(m, letterIndex(p)), -1)
  return letterAt(max + 1)
}

/**
 * Lettres sans trou ni doublon (A, B, D…) pour les rubriques de niveau 1 actives d'une
 * comptabilité, dans l'ordre lettre puis position. Renvoie seulement celles qui changent, dans
 * l'ordre croissant : appliquées dans cet ordre, deux rubriques n'ont jamais la même lettre
 * (chacune ne prend qu'une lettre libérée avant elle).
 */
export function reletterRoots(
  roots: ReadonlyArray<{ id: number; prefix: string | null; position: number }>
): Array<{ id: number; prefix: string }> {
  return [...roots]
    .sort(
      (a, b) =>
        comparePrefixes(a.prefix ?? '', b.prefix ?? '') || a.position - b.position || a.id - b.id
    )
    .map((r, i) => ({ id: r.id, prefix: letterAt(i), before: r.prefix }))
    .filter((r) => r.prefix !== r.before)
    .map(({ id, prefix }) => ({ id, prefix }))
}

/**
 * Chiffre du niveau 1 de chaque comptabilité, toujours le même : sorties A1, B1… ; entrées A2,
 * B2… (demandes du porteur, 2026-11-25). Jamais de A3 ni de D2 dans les sorties.
 */
export const LEDGER_FIRST_NUMBER: Record<Ledger, number> = { expense: 1, income: 2 }

/** Niveau 1 : « F » → « F1 » (sorties), « F2 » (entrées). */
export function rootCode(prefix: string, ledger: Ledger = 'expense'): string {
  return `${prefix}${LEDGER_FIRST_NUMBER[ledger]}`
}

/**
 * Style des numéros du niveau 2, commun à toutes les sœurs (une seule suite) : chiffres romains
 * dès qu'une sœur est un groupe (`A2-I`, `A2-II`…), chiffres arabes sinon (`A1-1`, `A1-2`…).
 * Règle du porteur (2026-11-25) : deux sœurs ne portent jamais le même rang (`A2-I` / `A2-1`).
 */
export type Level2Numeral = 'roman' | 'arabic'

export const level2Numeral = (siblingsHaveGroup: boolean): Level2Numeral =>
  siblingsHaveGroup ? 'roman' : 'arabic'

/**
 * Numéro d'un enfant selon son niveau (rang à partir de 1). `numeral` ne compte qu'au niveau 2
 * (cf. `level2Numeral`) ; niveau 3 en chiffres, niveau 4 en lettres malgaches.
 */
export function childCode(
  parentCode: string,
  childLevel: 2 | 3 | 4,
  rank: number,
  numeral: Level2Numeral = 'arabic'
): string {
  switch (childLevel) {
    case 2:
      return numeral === 'roman' ? `${parentCode}-${toRoman(rank)}` : `${parentCode}-${rank}`
    case 3:
      return `${parentCode}-${rank}`
    case 4:
      return `${parentCode} ${letterAt(rank - 1)})`
  }
}
