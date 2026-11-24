import { cva } from 'class-variance-authority'

/** Colonnes du tableau (table-fixed) : numéro | description | 3 montants | actions. */
export const col = {
  code: 'w-32',
  amount: 'w-40',
  actions: 'w-44'
} as const

export const headCell = cva(
  'sticky top-0 z-10 border-b bg-card px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase',
  {
    variants: { align: { left: 'text-left', right: 'text-right' } },
    defaultVariants: { align: 'left' }
  }
)

/** Rangée : niveau 1 = bandeau de rubrique ; groupe = texte appuyé ; feuille = montants. */
export const sheetRow = cva('group border-b last:border-b-0', {
  variants: {
    kind: {
      root: 'bg-muted/60',
      group: 'focus-within:bg-muted/30 hover:bg-muted/30',
      leaf: 'focus-within:bg-muted/30 hover:bg-muted/30',
      add: 'bg-accent/40'
    }
  }
})

export const codeCell = cva('px-3 align-middle whitespace-nowrap tabular-nums', {
  variants: {
    kind: {
      root: 'py-2.5 font-display text-base font-semibold',
      group: 'py-1.5 font-medium',
      leaf: 'py-1.5 text-muted-foreground'
    }
  }
})

/** Retrait de la description selon le niveau (l'arbre se lit dans cette colonne). */
export const descriptionCell = cva('py-1 pr-1', {
  variants: {
    level: { 1: 'pl-1', 2: 'pl-5', 3: 'pl-9', 4: 'pl-13' }
  }
})

/** Texte cliquable qui passe en édition : discret, mais visiblement modifiable au survol. */
export const editableText = cva(
  'w-full cursor-text truncate rounded-md px-2 py-1 text-left outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: { kind: { section: 'font-semibold', group: 'font-medium', line: '' } },
    defaultVariants: { kind: 'line' }
  }
)

/** Case montant : saisie + bouton détail côte à côte. */
export const amountCell = 'flex items-center gap-0.5'

/** Total d'une case détaillée : lecture seule, aligné comme une saisie. */
export const amountReadonly =
  'h-8 flex-1 truncate px-2 text-right leading-8 font-medium tabular-nums'

export const amountInput = cva([
  'h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-right tabular-nums outline-none',
  'placeholder:text-muted-foreground/60 hover:border-input focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/40',
  'disabled:opacity-50'
])

/** Actions de ligne : visibles au survol ou au clavier, toujours atteignables au Tab. */
export const rowActions =
  'flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100'

/**
 * Liste déroulante native, alignée visuellement sur <Input>. Chevron du navigateur masqué
 * (`appearance-none`) et remplacé par `selectChevron`, qui peut recevoir une marge.
 */
export const selectField =
  'h-8 w-full appearance-none rounded-lg border border-input bg-transparent pr-9 pl-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

/** Chevron du select : 4px de marge (mr-1) en plus du retrait du champ. */
export const selectChevron =
  'pointer-events-none absolute top-1/2 right-2 mr-1 size-4 -translate-y-1/2 text-muted-foreground'
