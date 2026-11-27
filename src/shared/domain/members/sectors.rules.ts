/** Secteurs (porteur, 2026-11-27) : nom mis en forme, numéro romain stable. */
import { normalizeFirstName } from './members.rules'

/** Majuscule au début de chaque mot : « ambohitsara avaratra » → « Ambohitsara Avaratra ». */
export function normalizeSectorName(input: string): string {
  return normalizeFirstName(input)
}

/** Numéro suivant (secteurs, foyers) : jamais réattribué, `max` compte toutes les lignes. */
export function nextNumber(max: number | null): number {
  return (max ?? 0) + 1
}
