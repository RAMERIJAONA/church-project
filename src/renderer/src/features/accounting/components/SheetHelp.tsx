import { Info, List, Plus } from 'lucide-react'

/**
 * Mode d'emploi du tableau, toujours visible (le porteur ne voyait pas qu'on pouvait saisir un
 * montant dans chaque case, 2026-11-25). Non imprimé.
 */
export function SheetHelp(): React.JSX.Element {
  return (
    <div
      data-print="hide"
      className="flex items-start gap-3 rounded-xl border bg-accent/40 px-4 py-3 text-sm"
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <ul className="flex flex-col gap-1">
        <li>
          Cliquez dans une case <span className="font-medium">« Montant »</span> et tapez la somme
          en Ariary (Ar), puis <kbd className="font-sans font-semibold">Entrée</kbd> pour passer à
          la case suivante. La date et l’heure sont enregistrées automatiquement.
        </li>
        <li className="text-muted-foreground">
          <List aria-hidden className="inline size-3.5 align-[-2px]" /> à côté d’un montant : le
          détailler en plusieurs saisies avec libellé.{' '}
          <Plus aria-hidden className="inline size-3.5 align-[-2px]" /> en bout de ligne : ajouter
          une sous-rubrique (modifier, déplacer et supprimer sont à côté).
        </li>
      </ul>
    </div>
  )
}
