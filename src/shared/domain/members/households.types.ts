/** Types et schémas d'entrée des foyers (contrat IPC). */

/** Secteur tel qu'il est rappelé sur un foyer ou un fidèle. */
export interface SectorRef {
  id: number
  number: number
  name: string
  /** « II » */
  numeral: string
}

/** Parrain d'un foyer : un fidèle diacre. */
export interface SponsorDTO {
  id: number
  lastName: string
  firstName: string
  matricule: string
}
