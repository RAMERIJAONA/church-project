import { cva } from 'class-variance-authority'

/** Colonnes du tableau (table-fixed) : numéro | description | 3 montants | actions. */
export const col = {
  code: 'w-36',
  amount: 'w-40',
  actions: 'w-44'
} as const

/**
 * En-tête. `amount` : aligné à droite sur la fin des montants, c'est-à-dire sur « Ar »
 * (marge de la case 4 px + bouton de détail 28 px + écart 2 px + retrait de « Ar » 8 px).
 * À l'impression (pas de bouton) : print.css, `data-amount-head`.
 */
export const headCell = cva(
  'sticky top-0 z-10 border-b bg-card py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase',
  {
    variants: {
      align: { left: 'px-3 text-left', right: 'px-3 text-right', amount: 'pr-10.5 pl-3 text-right' }
    },
    defaultVariants: { align: 'left' }
  }
)

/**
 * Rangée : niveau 1 = bandeau de rubrique ; groupe = texte appuyé ; feuille = montants.
 * `amounts` : cellules alignées en haut, sur la ligne du champ de montant (la date est dessous).
 */
export const sheetRow = cva('group border-b last:border-b-0', {
  variants: {
    kind: {
      root: 'bg-muted/60',
      group: 'focus-within:bg-muted/30 hover:bg-muted/30',
      leaf: 'focus-within:bg-muted/30 hover:bg-muted/30',
      add: 'bg-accent/40'
    },
    amounts: { true: '*:align-top', false: '' }
  },
  defaultVariants: { amounts: false }
})

/**
 * Numéro : décalé selon le niveau (l'arbre se lit aussi dans cette colonne). Sans niveau :
 * ligne de total.
 */
export const codeCell = cva('pr-2 align-middle whitespace-nowrap tabular-nums', {
  variants: {
    kind: {
      root: 'py-2.5 font-display text-base font-semibold',
      group: 'py-1.5 font-medium',
      // Centré sur le champ de montant (haut de case 4 px + 16 px) : 10 px + demi-ligne 10 px
      leaf: 'pt-2.5 pb-1.5 text-muted-foreground'
    },
    level: { 1: 'pl-3', 2: 'pl-6', 3: 'pl-9', 4: 'pl-12 text-xs' }
  },
  // Niveau 4 en petit (ligne de 16 px) : 12 px au-dessus pour rester centré sur le champ
  compoundVariants: [{ kind: 'leaf', level: 4, class: 'pt-3' }],
  defaultVariants: { level: 1 }
})

/** Retrait de la description selon le niveau, avec un trait de rattachement au parent. */
export const descriptionCell = cva('pr-1', {
  variants: {
    level: { 1: 'pl-1', 2: 'pl-3', 3: 'pl-9', 4: 'pl-15' },
    // Rangée à montants : texte centré sur le champ (6 px + 4 px + demi-ligne 10 px = 20 px)
    amounts: { true: 'pt-1.5 pb-1', false: 'py-1' }
  },
  defaultVariants: { amounts: false }
})

/** Actions de ligne ; rangée à montants : boutons centrés sur le champ (6 px + 14 px). */
export const actionsCell = cva('px-2', {
  variants: { amounts: { true: 'pt-1.5', false: '' } },
  defaultVariants: { amounts: false }
})

/** Trait « └ » devant une sous-rubrique (niveaux 2 à 4). */
export const treeConnector = 'size-3.5 shrink-0 text-muted-foreground/70'

/** Texte cliquable qui passe en édition : discret, mais visiblement modifiable au survol. */
export const editableText = cva(
  'line-clamp-2 min-w-0 flex-1 cursor-text rounded-md px-2 py-1 text-left break-words outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: { kind: { section: 'font-semibold', group: 'font-medium', line: '' } },
    defaultVariants: { kind: 'line' }
  }
)

/** Sous-total d'un groupe ou total général : lecture seule, appuyé. */
export const totalCell = 'px-3 py-1 text-right font-semibold tabular-nums whitespace-nowrap'

/** Ligne « Total général » en pied de tableau. */
export const totalRow = 'border-t-2 bg-muted/60'

/** Cellule d'une case montant, d'un sous-total ou d'un total. */
export const amountTd = 'px-1 py-1'

/** Case montant : saisie + bouton détail côte à côte. */
export const amountCell = 'flex items-center gap-0.5'

/** Sous-total ou total : aligné sur les montants saisis (place du bouton de détail réservée). */
export const subtotalText =
  'min-w-0 flex-1 truncate px-2 text-right leading-8 font-semibold tabular-nums'

/** Place du bouton de détail, laissée vide sous un sous-total (alignement des colonnes). */
export const detailSpacer = 'size-7 shrink-0'

/** Sigle « Ar » après un montant affiché : discret, comme dans les champs. */
export const currencyMark = 'text-xs font-normal text-muted-foreground'

/** Total d'une case détaillée : lecture seule (fond grisé), aligné comme une saisie. */
export const amountReadonly =
  'h-8 min-w-0 flex-1 truncate rounded-md bg-muted/50 px-2 text-right leading-8 font-medium tabular-nums'

/**
 * Case de saisie : toujours encadrée, pour qu'on voie qu'on peut y taper un montant (demande du
 * porteur, 2026-11-25). Place à droite pour le sigle « Ar ».
 */
export const amountInput = cva([
  'h-8 w-full rounded-md border border-input bg-background pr-7 pl-2 text-right tabular-nums outline-none',
  'placeholder:text-muted-foreground/60 hover:border-ring/60 focus:border-ring focus:ring-2 focus:ring-ring/40',
  // Case vide : cadre en pointillés, plus léger, pour ne pas charger le tableau
  'placeholder-shown:border-dashed placeholder-shown:bg-transparent',
  'disabled:opacity-50'
])

/** Sigle « Ar » affiché dans la case, à droite du montant. */
export const amountSuffix =
  'pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground'

/**
 * Date et heure de la dernière saisie, sous le montant. Hauteur fixe, même vide : toutes les
 * rangées à montants ont la même hauteur. Alignée à droite sur « Ar » (38 px).
 */
export const amountDate = 'mt-0.5 h-4 pr-9.5 text-right text-xs leading-4 text-muted-foreground'

/** Actions de ligne : visibles au survol ou au clavier, toujours atteignables au Tab. */
export const rowActions =
  'flex items-center justify-end gap-0.5 opacity-40 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100'

/**
 * Liste déroulante native, alignée visuellement sur <Input>. Chevron du navigateur masqué
 * (`appearance-none`) et remplacé par `selectChevron`, qui peut recevoir une marge.
 */
export const selectField =
  'h-8 w-full appearance-none rounded-lg border border-input bg-transparent pr-9 pl-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

/** Chevron du select : 4px de marge (mr-1) en plus du retrait du champ. */
export const selectChevron =
  'pointer-events-none absolute top-1/2 right-2 mr-1 size-4 -translate-y-1/2 text-muted-foreground'

/** Carte de la synthèse des réalisations (cliquable : ouvre la vue de la période). */
export const summaryCard = cva(
  'flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4 py-3 text-left outline-none hover:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: { active: { true: 'border-primary ring-1 ring-primary', false: '' } },
    defaultVariants: { active: false }
  }
)
