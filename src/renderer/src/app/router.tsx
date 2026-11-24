import { createHashRouter, type RouteObject } from 'react-router'
import { RouteErrorBoundary } from './errors/RouteErrorBoundary'
import { AppLayout } from './layout/AppLayout'
import type { RouteHandle } from './layout/route-handle'

/**
 * HashRouter obligatoire (file:// en prod). Une feature = un chunk chargé à la demande ;
 * chaque route a son propre Error Boundary (le layout reste affiché).
 */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        handle: { title: 'Accueil' } satisfies RouteHandle,
        errorElement: <RouteErrorBoundary />,
        lazy: async () => ({
          Component: (await import('@renderer/features/home/pages/HomePage')).HomePage
        })
      },
      {
        path: 'comptabilite',
        handle: {
          title: 'Comptabilité',
          description: 'Rubriques, lignes et montants par année'
        } satisfies RouteHandle,
        errorElement: <RouteErrorBoundary />,
        lazy: async () => ({
          Component: (await import('@renderer/features/accounting/pages/AccountingPage'))
            .AccountingPage
        })
      },
      {
        path: 'parametres',
        handle: {
          title: 'Paramètres',
          description: 'Apparence, sauvegardes et aide'
        } satisfies RouteHandle,
        errorElement: <RouteErrorBoundary />,
        lazy: async () => ({
          Component: (await import('@renderer/features/settings/pages/SettingsPage')).SettingsPage
        })
      },
      {
        path: '*',
        handle: { title: 'Page introuvable' } satisfies RouteHandle,
        Component: () => <p className="text-sm text-muted-foreground">Cette page n’existe pas.</p>
      }
    ]
  }
]

export function createAppRouter(): ReturnType<typeof createHashRouter> {
  return createHashRouter(routes)
}
