import { createHashRouter, Navigate, type RouteObject } from 'react-router'
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
      // Fidèles, foyers et secteurs : module indépendant de la comptabilité
      {
        path: 'fideles',
        handle: {
          title: 'Liste des fidèles',
          description: 'Tous les fidèles, tous foyers confondus : recherche, filtres, tri',
          fillHeight: true
        } satisfies RouteHandle,
        errorElement: <RouteErrorBoundary />,
        lazy: async () => ({
          Component: (await import('@renderer/features/members/pages/MembersPage')).MembersPage
        })
      },
      {
        path: 'foyers',
        handle: {
          title: 'Foyers',
          description: 'Foyers de l’église : numéro, secteur, parrain et membres',
          fillHeight: true
        } satisfies RouteHandle,
        errorElement: <RouteErrorBoundary />,
        lazy: async () => ({
          Component: (await import('@renderer/features/members/pages/HouseholdsPage'))
            .HouseholdsPage
        })
      },
      {
        path: 'foyers/:id',
        handle: {
          title: 'Foyer',
          description: 'Membres du foyer, par rang : matricules, statuts, parrain',
          fillHeight: true
        } satisfies RouteHandle,
        errorElement: <RouteErrorBoundary />,
        lazy: async () => ({
          Component: (await import('@renderer/features/members/pages/HouseholdPage')).HouseholdPage
        })
      },
      {
        path: 'secteurs',
        handle: {
          title: 'Secteurs',
          description: 'Secteurs de l’église, numérotés I, II, III… dans l’ordre de création'
        } satisfies RouteHandle,
        errorElement: <RouteErrorBoundary />,
        lazy: async () => ({
          Component: (await import('@renderer/features/members/pages/SectorsPage')).SectorsPage
        })
      },
      // Deux comptabilités, mêmes règles et même affichage (numéros : sorties A1, entrées A2)
      {
        path: 'comptabilite/entrees',
        handle: {
          title: 'Comptabilité des entrées',
          description: 'Recettes : rubriques, estimations et réalisations par année'
        } satisfies RouteHandle,
        errorElement: <RouteErrorBoundary />,
        lazy: async () => ({
          Component: (await import('@renderer/features/accounting/pages/AccountingPage')).IncomePage
        })
      },
      {
        path: 'comptabilite/sorties',
        handle: {
          title: 'Comptabilité des sorties',
          description: 'Dépenses : rubriques, estimations et réalisations par année'
        } satisfies RouteHandle,
        errorElement: <RouteErrorBoundary />,
        lazy: async () => ({
          Component: (await import('@renderer/features/accounting/pages/AccountingPage'))
            .ExpensesPage
        })
      },
      // Ancienne adresse (avant la comptabilité des entrées) : les sorties
      { path: 'comptabilite', element: <Navigate to="/comptabilite/sorties" replace /> },
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
