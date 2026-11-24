import { Outlet } from 'react-router'
import { AppHeader } from './AppHeader'
import { Sidebar } from './Sidebar'

export function AppLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
