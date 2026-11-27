/**
 * Filtres et tri de la liste globale gardés dans l'adresse (comme les vues de la comptabilité) :
 * `secteur`, `foyer`, `sexe`, `baptise`, `communiant`, `diacre`, `tri`, `ordre`. Fonctions pures.
 */
import { SEXES, type Sex } from '@shared/domain/members/households.rules'
import { MEMBER_SORTS, type MemberSort } from '@shared/domain/members/members.types'

export interface MemberListFilters {
  sectorId?: number
  householdNumber?: number
  sex?: Sex
  baptized?: boolean
  communicant?: boolean
  deacon?: boolean
}

export interface MemberListView extends MemberListFilters {
  sort: MemberSort
  order: 'asc' | 'desc'
}

type Key = keyof MemberListView

const PARAM: Record<Key, string> = {
  sectorId: 'secteur',
  householdNumber: 'foyer',
  sex: 'sexe',
  baptized: 'baptise',
  communicant: 'communiant',
  deacon: 'diacre',
  sort: 'tri',
  order: 'ordre'
}

export const FILTER_KEYS = [
  'sectorId',
  'householdNumber',
  'sex',
  'baptized',
  'communicant',
  'deacon'
] as const satisfies ReadonlyArray<keyof MemberListFilters>

const positive = (v: string | null): number | undefined =>
  v !== null && /^[1-9]\d*$/.test(v) ? Number(v) : undefined
const yesNo = (v: string | null): boolean | undefined =>
  v === 'oui' ? true : v === 'non' ? false : undefined

export function listFromParams(p: URLSearchParams): MemberListView {
  const view: MemberListView = {
    sort: MEMBER_SORTS.find((s) => s === p.get(PARAM.sort)) ?? 'name',
    order: p.get(PARAM.order) === 'desc' ? 'desc' : 'asc'
  }
  const sectorId = positive(p.get(PARAM.sectorId))
  const householdNumber = positive(p.get(PARAM.householdNumber))
  const sex = SEXES.find((s) => s === p.get(PARAM.sex))
  const flags = {
    baptized: yesNo(p.get(PARAM.baptized)),
    communicant: yesNo(p.get(PARAM.communicant)),
    deacon: yesNo(p.get(PARAM.deacon))
  }
  if (sectorId !== undefined) view.sectorId = sectorId
  if (householdNumber !== undefined) view.householdNumber = householdNumber
  if (sex !== undefined) view.sex = sex
  for (const [key, value] of Object.entries(flags)) {
    if (value !== undefined) view[key as keyof typeof flags] = value
  }
  return view
}

const toParam = (key: Key, value: MemberListView[Key]): string | null => {
  if (value === undefined) return null
  if (key === 'sort') return value === 'name' ? null : String(value)
  if (key === 'order') return value === 'desc' ? 'desc' : null
  if (typeof value === 'boolean') return value ? 'oui' : 'non'
  return String(value)
}

/** Copie de `p` avec ces valeurs ; une valeur par défaut ou absente retire le paramètre. */
export function paramsWith(p: URLSearchParams, patch: Partial<MemberListView>): URLSearchParams {
  const next = new URLSearchParams(p)
  for (const key of Object.keys(patch) as Key[]) {
    const value = toParam(key, patch[key])
    if (value === null) next.delete(PARAM[key])
    else next.set(PARAM[key], value)
  }
  return next
}
