import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, DatabaseZap, Settings } from 'lucide-react'
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

/** Les deux comptabilités, mêmes règles (numéros : entrées A2, sorties A1). */
const LEDGER_LINKS = [
  {
    to: '/comptabilite/entrees',
    title: 'Comptabilité des entrées',
    text: 'Recettes de l’église : estimations et réalisations, année par année.',
    icon: ArrowDownToLine
  },
  {
    to: '/comptabilite/sorties',
    title: 'Comptabilité des sorties',
    text: 'Dépenses de l’église : estimations et réalisations, année par année.',
    icon: ArrowUpFromLine
  }
] as const

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
        <CardContent className="flex flex-col gap-3">
          {LEDGER_LINKS.map(({ to, title, text, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-lg border p-4 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-5 shrink-0 text-primary" aria-hidden />
              <span className="flex-1 space-y-1 text-sm">
                <span className="block font-medium">{title}</span>
                <span className="block text-muted-foreground">{text}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          ))}
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
