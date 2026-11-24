import { Button } from '@renderer/components/ui/button'

export function App(): React.JSX.Element {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Church Manager</h1>
      <Button>Bouton shadcn</Button>
    </main>
  )
}
