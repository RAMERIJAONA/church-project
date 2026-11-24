import { useState } from 'react'
import { RouterProvider } from 'react-router'
import { AppProviders } from '@renderer/app/AppProviders'
import { createAppRouter } from '@renderer/app/router'
import { createQueryClient } from '@renderer/lib/query-client'

export function App(): React.JSX.Element {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(createAppRouter)
  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
