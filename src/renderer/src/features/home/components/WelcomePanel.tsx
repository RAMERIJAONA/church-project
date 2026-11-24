import { BookOpenText, ChevronRight, DatabaseZap, Settings } from 'lucide-react'
import { Link } from 'react-router'
import { buttonVariants } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { APP_NAME } from '@shared/domain/identity'

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
            {APP_NAME} fonctionne entièrement sur cet ordinateur, sans connexion internet. Vos
            données restent ici et sont sauvegardées automatiquement chaque jour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            to="/comptabilite"
            className="flex items-center gap-3 rounded-lg border p-4 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BookOpenText className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="flex-1 space-y-1 text-sm">
              <span className="block font-medium">Comptabilité</span>
              <span className="block text-muted-foreground">
                Rubriques, lignes et montants de l’église, année par année.
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
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
