import { useMatches } from 'react-router'

/** Métadonnées d'affichage portées par chaque route (`handle`). */
export interface RouteHandle {
  title: string
  description?: string
  /**
   * La page occupe exactement la hauteur visible et fait défiler elle-même une partie (Fidèles :
   * seul le tableau défile). Sans cette option, une page plus haute fait défiler <main> et garde
   * sa marge du bas (régression du 2026-11-27).
   */
  fillHeight?: boolean
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
