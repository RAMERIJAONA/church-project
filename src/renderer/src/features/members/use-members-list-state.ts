import { useState } from 'react'
import { MEMBERS_PAGE_SIZE } from '@shared/domain/members/members.types'
import { clampPage } from './members.utils'
import { useDebouncedValue } from './use-debounced-value'

export const SEARCH_DEBOUNCE_MS = 200

/**
 * État de la liste : texte tapé, recherche envoyée (après 200 ms), page. Changer la recherche
 * revient en page 1 ; la page est ramenée sur la dernière qui existe quand `total` baisse.
 */
export interface MembersListState {
  /** Texte tapé (affiché dans le champ) */
  search: string
  /** Recherche envoyée au main, 200 ms après la dernière frappe */
  query: string
  page: number
  setSearch: (search: string) => void
  setPage: (page: number) => void
}

export function useMembersListState(total: number | undefined): MembersListState {
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

  return { search, query, page, setSearch, setPage }
}
