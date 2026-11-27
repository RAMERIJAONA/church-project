import { Outlet } from 'react-router'
import { AppHeader } from './AppHeader'
import { Sidebar } from './Sidebar'

export function AppLayout(): React.JSX.Element {
  return (
    // Impression : hauteur libre et pas de défilement, sinon seule la partie visible s'imprime
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto print:overflow-visible">
          {/* h-full : une page peut occuper exactement la hauteur visible et ne faire défiler
              qu'une partie (Fidèles) ; une page plus haute fait toujours défiler <main> */}
          <div className="mx-auto h-full w-full max-w-6xl px-8 py-8 print:h-auto print:max-w-none print:p-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
