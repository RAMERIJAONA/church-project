import { Users } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@renderer/components/ui/button'

/** Aucun fidèle enregistré : ils s'ajoutent depuis leur foyer. */
export function MembersEmptyState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Users className="size-6" aria-hidden />
      </span>
      <div className="max-w-md space-y-1.5">
        <h2 className="font-display text-lg font-semibold">Aucun fidèle enregistré</h2>
        <p className="text-sm text-muted-foreground">
          Les fidèles s’ajoutent depuis leur foyer : créez un foyer, puis ajoutez-y ses membres.
        </p>
      </div>
      <Button asChild>
        <Link to="/foyers">Aller aux foyers</Link>
      </Button>
    </div>
  )
}
