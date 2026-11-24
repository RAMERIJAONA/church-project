import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from '@renderer/components/common/Toaster'
import { useSettings } from '@renderer/features/settings/queries'
import { useApplyTheme } from './theme/useApplyTheme'

function ThemeSync({ children }: { children: ReactNode }): React.JSX.Element {
  const settings = useSettings()
  useApplyTheme(settings.data)
  return (
    <>
      {children}
      <Toaster theme={settings.data?.theme ?? 'light'} />
    </>
  )
}

export function AppProviders({
  queryClient,
  children
}: {
  queryClient: QueryClient
  children: ReactNode
}): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync>{children}</ThemeSync>
    </QueryClientProvider>
  )
}
