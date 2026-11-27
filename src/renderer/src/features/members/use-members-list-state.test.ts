import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMembersListState } from './use-members-list-state'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useMembersListState', () => {
  it('attend 200 ms avant de lancer la recherche', () => {
    const { result } = renderHook(() => useMembersListState(undefined))
    act(() => result.current.setSearch('rak'))
    expect(result.current.search).toBe('rak')
    expect(result.current.query).toBe('')
    act(() => vi.advanceTimersByTime(200))
    expect(result.current.query).toBe('rak')
  })

  it('revient en page 1 quand la recherche change', () => {
    const { result } = renderHook(() => useMembersListState(500))
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)
    act(() => result.current.setSearch('rakto'))
    expect(result.current.page).toBe(1)
  })

  it('revient à la page précédente quand la dernière page se vide', () => {
    const { result, rerender } = renderHook(({ total }) => useMembersListState(total), {
      initialProps: { total: 101 as number | undefined }
    })
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)
    rerender({ total: 100 })
    expect(result.current.page).toBe(2)
  })
})
