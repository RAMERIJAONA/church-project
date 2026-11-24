import { useMatches } from 'react-router'

/** Métadonnées d'affichage portées par chaque route (`handle`). */
export interface RouteHandle {
  title: string
  description?: string
}

function isRouteHandle(value: unknown): value is RouteHandle {
  return (
    typeof value === 'object' && value !== null && typeof (value as RouteHandle).title === 'string'
  )
}

/** Handle de la route active la plus profonde. */
export function useRouteHandle(): RouteHandle | undefined {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i]?.handle
    if (isRouteHandle(handle)) return handle
  }
  return undefined
}
