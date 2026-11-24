import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { SettingsPage } from '@renderer/features/settings/pages/SettingsPage'
import { createQueryClient } from '@renderer/lib/query-client'

export function App(): React.JSX.Element {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>
  )
}
