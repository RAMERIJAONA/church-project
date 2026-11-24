import { DatabaseZap, LayoutGrid, Settings } from 'lucide-react'
import { Link } from 'react-router'
import { buttonVariants } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'

export interface WelcomePanelProps {
  version?: string
}

export function WelcomePanel({ version }: WelcomePanelProps): React.JSX.Element {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Bienvenue</CardTitle>
          <CardDescription>
            Church Manager fonctionne entièrement sur cet ordinateur, sans connexion internet. Vos
            données restent ici et sont sauvegardées automatiquement chaque jour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
            <LayoutGrid className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Les modules arrivent bientôt</p>
              <p className="text-muted-foreground">
                Les écrans de gestion apparaîtront dans la barre de gauche au fil des versions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DatabaseZap className="size-4 text-success" aria-hidden />
            Données prêtes
          </CardTitle>
          <CardDescription>
            {version ? `Version ${version}. ` : ''}La base locale est ouverte et à jour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/parametres" className={buttonVariants({ variant: 'outline' })}>
            <Settings aria-hidden />
            Ouvrir les paramètres
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
