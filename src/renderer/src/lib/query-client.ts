import { QueryClient } from '@tanstack/react-query'

/**
 * IPC local : pas de réseau, donc ni retry (une erreur est déterministe), ni refetch au focus.
 * Les données ne changent que par nos propres mutations, qui invalident leurs clés.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
      mutations: { retry: false }
    }
  })
}
