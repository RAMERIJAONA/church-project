import { useQuery } from '@tanstack/react-query'
import { invoke } from './ipc-client'

export const appInfoKeys = { all: ['app', 'info'] as const }

/** Nom, version, mode debug de l'application (transverse : sidebar, aide, erreurs). */
export function useAppInfo() {
  return useQuery({ queryKey: appInfoKeys.all, queryFn: () => invoke('app.info', undefined) })
}
