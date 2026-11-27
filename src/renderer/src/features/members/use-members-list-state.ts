import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { MEMBERS_PAGE_SIZE, type MemberSort } from '@shared/domain/members/members.types'
import {
  FILTER_KEYS,
  listFromParams,
  paramsWith,
  type MemberListFilters,
  type MemberListView
} from './members-list-params'
import { clampPage } from './members.utils'
import { useDebouncedValue } from './use-debounced-value'

export const SEARCH_DEBOUNCE_MS = 200

/**
 * État de la liste : texte tapé, recherche envoyée (après 200 ms), page, filtres et tri (dans
 * l'adresse). Changer la recherche ou un filtre revient en page 1 ; la page est ramenée sur la
 * dernière qui existe quand `total` baisse.
 */
export interface MembersListState {
  /** Texte tapé (affiché dans le champ) */
  search: string
  /** Recherche envoyée au main, 200 ms après la dernière frappe */
  query: string
  page: number
  setSearch: (search: string) => void
  setPage: (page: number) => void
  /** Filtres et tri lus dans l'adresse */
  list: MemberListView
  hasFilters: boolean
  setFilters: (patch: Partial<MemberListFilters>) => void
  clearFilters: () => void
  /** Même colonne : ordre inversé ; autre colonne : croissant */
  toggleSort: (sort: MemberSort) => void
}

export function useMembersListState(total: number | undefined): MembersListState {
  const [params, setParams] = useSearchParams()
  const list = listFromParams(params)
  const [search, setSearchText] = useState('')
  const [requestedPage, setPage] = useState(1)
  const query = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)
  const page =
    total === undefined ? requestedPage : clampPage(requestedPage, total, MEMBERS_PAGE_SIZE)
  // La page ramenée devient la page demandée : un ajout ultérieur ne fait pas revenir en arrière
  // (mise à jour pendant le rendu, gardée par la comparaison)
  if (page !== requestedPage) setPage(page)

  const setSearch = (value: string): void => {
    setSearchText(value)
    setPage(1)
  }

  const update = (patch: Partial<MemberListView>): void => {
    setParams((current) => paramsWith(current, patch), { replace: true })
    setPage(1)
  }

  return {
    search,
    query,
    page,
    setSearch,
    setPage,
    list,
    hasFilters: FILTER_KEYS.some((k) => list[k] !== undefined),
    setFilters: update,
    clearFilters: () => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined]))),
    toggleSort: (sort) =>
      update({ sort, order: list.sort === sort && list.order === 'asc' ? 'desc' : 'asc' })
  }
}
