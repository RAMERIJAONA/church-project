import { Outlet } from 'react-router'
import { AppHeader } from './AppHeader'
import { useRouteHandle } from './route-handle'
import { Sidebar } from './Sidebar'

export function AppLayout(): React.JSX.Element {
  const fillHeight = useRouteHandle()?.fillHeight === true
  return (
    // Impression : hauteur libre et pas de défilement, sinon seule la partie visible s'imprime
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto print:overflow-visible">
          {/* h-full seulement pour une page qui gère son défilement (`fillHeight`, Fidèles) :
              sinon une page plus haute que la fenêtre perdrait sa marge du bas */}
          <div
            className={`mx-auto w-full max-w-6xl px-8 py-8 print:h-auto print:max-w-none print:p-0 ${fillHeight ? 'h-full' : ''}`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
