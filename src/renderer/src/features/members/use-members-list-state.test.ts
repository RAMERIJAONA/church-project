import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMembersListState } from './use-members-list-state'

beforeEach(() => vi.useFakeTimers())

/** Le hook lit et écrit les filtres dans l'adresse (HashRouter en vrai, mémoire ici). */
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(MemoryRouter, null, children)

function useStateAndUrl(total: number | undefined) {
  return { state: useMembersListState(total), search: useLocation().search }
}
afterEach(() => vi.useRealTimers())

describe('useMembersListState', () => {
  it('attend 200 ms avant de lancer la recherche', () => {
    const { result } = renderHook(() => useMembersListState(undefined), { wrapper })
    act(() => result.current.setSearch('rak'))
    expect(result.current.search).toBe('rak')
    expect(result.current.query).toBe('')
    act(() => vi.advanceTimersByTime(200))
    expect(result.current.query).toBe('rak')
  })

  it('revient en page 1 quand la recherche change', () => {
    const { result } = renderHook(() => useMembersListState(500), { wrapper })
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)
    act(() => result.current.setSearch('rakto'))
    expect(result.current.page).toBe(1)
  })

  it('revient à la page précédente quand la dernière page se vide', () => {
    const { result, rerender } = renderHook(({ total }) => useMembersListState(total), {
      initialProps: { total: 101 as number | undefined },
      wrapper
    })
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)
    rerender({ total: 100 })
    expect(result.current.page).toBe(2)
  })

  it('reste sur la page ramenée quand un fidèle est ajouté ensuite', () => {
    const { result, rerender } = renderHook(({ total }) => useMembersListState(total), {
      initialProps: { total: 101 as number | undefined },
      wrapper
    })
    act(() => result.current.setPage(3))
    rerender({ total: 100 })
    rerender({ total: 101 })
    expect(result.current.page).toBe(2)
  })

  it('trie par une colonne, puis à l’envers au second clic', () => {
    const { result } = renderHook(() => useStateAndUrl(500), { wrapper })
    act(() => result.current.state.toggleSort('matricule'))
    expect(result.current.search).toBe('?tri=matricule')
    expect(result.current.state.list).toMatchObject({ sort: 'matricule', order: 'asc' })
    act(() => result.current.state.toggleSort('matricule'))
    expect(result.current.search).toBe('?tri=matricule&ordre=desc')
    act(() => result.current.state.toggleSort('sector'))
    expect(result.current.search).toBe('?tri=sector')
  })

  it('revient en page 1 quand un filtre change, et efface les filtres', () => {
    const { result } = renderHook(() => useStateAndUrl(500), { wrapper })
    act(() => result.current.state.setPage(3))
    act(() => result.current.state.setFilters({ deacon: true, sex: 'F' }))
    expect(result.current.state.page).toBe(1)
    expect(result.current.state.list).toMatchObject({ deacon: true, sex: 'F' })
    expect(result.current.state.hasFilters).toBe(true)
    act(() => result.current.state.clearFilters())
    expect(result.current.search).toBe('')
    expect(result.current.state.hasFilters).toBe(false)
  })
})
