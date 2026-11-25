import { cva } from 'class-variance-authority'

/**
 * Colonnes du tableau (table-fixed) : numéro | description | 3 montants | actions.
 * Montant : jamais tronqué (demande du porteur, 2026-11-25). Largeur = le plus grand montant
 * (« 999 999 999 999 », 15 caractères ; 17ch avec la marge du gras et de « Ar ») + marges et
 * bouton de détail (19 pas d'espacement, qui suivent la densité ; le texte, lui, n'en dépend
 * pas, d'où les `ch`). À l'impression : pas de bouton de détail.
 */
export const col = {
  code: 'w-36 print:w-28',
  amount: 'w-[calc(var(--spacing)*19+17ch)] print:w-[calc(var(--spacing)*8+17ch)]',
  actions: 'w-20'
} as const

/** Cadre du tableau ; trop étroit (petite fenêtre) : défilement horizontal plutôt que coupure. */
export const sheetFrame =
  'min-w-[60rem] overflow-clip rounded-xl border bg-card text-sm print:min-w-0'

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

/**
 * Graisse du texte selon le NIVEAU seulement (règle du porteur, 2026-11-25) : un groupe et une
 * rubrique à montant de même niveau s'écrivent pareil (A2-I et A2-II).
 */
const LEVEL_WEIGHT = { 1: 'font-semibold', 2: 'font-medium', 3: '', 4: '' } as const

/** Description en lecture seule (vues par période), même typographie que `editableText`. */
export const readOnlyDescription = cva('min-w-0 flex-1 px-2 py-1 break-words', {
  variants: { level: LEVEL_WEIGHT }
})

/**
 * Numéro : décalé selon le niveau (l'arbre se lit aussi dans cette colonne) ; police et couleur
 * selon le niveau seulement. Sans niveau : ligne de total (comme le niveau 1).
 */
export const codeCell = cva('pr-2 align-middle whitespace-nowrap tabular-nums', {
  variants: {
    level: {
      1: 'py-2.5 pl-3 font-display text-base font-semibold',
      2: 'py-1.5 pl-6 font-medium',
      3: 'py-1.5 pl-9 text-muted-foreground',
      4: 'py-1.5 pl-12 text-xs text-muted-foreground'
    }
  },
  defaultVariants: { level: 1 }
})

/** Retrait de la description selon le niveau, avec un trait de rattachement au parent. */
export const descriptionCell = cva('py-1 pr-1', {
  variants: {
    level: { 1: 'pl-1', 2: 'pl-3', 3: 'pl-9', 4: 'pl-15' }
  }
})

/** Trait « └ » devant une sous-rubrique (niveaux 2 à 4). */
export const treeConnector = 'size-3.5 shrink-0 text-muted-foreground/70'

/** Texte cliquable qui passe en édition : discret, mais visiblement modifiable au survol. */
export const editableText = cva(
  'min-w-0 flex-1 cursor-text rounded-md px-2 py-1 text-left break-words outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: { level: LEVEL_WEIGHT }
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
  'min-w-0 flex-1 px-2 text-right leading-8 font-semibold whitespace-nowrap tabular-nums'

/** Place du bouton de détail, laissée vide sous un sous-total (alignement des colonnes). */
export const detailSpacer = 'size-7 shrink-0'

/**
 * Sigle « Ar » après un montant affiché : toujours de la même graisse que le chiffre. Montant
 * en gras (sous-totaux, totaux) : `strong`, même taille et couleur que le chiffre, sinon le
 * petit « Ar » gris paraît non gras (retours du porteur, 2026-11-25). Ailleurs : petit et gris.
 */
export const currencyMark = cva('', {
  variants: {
    strong: { true: '', false: 'text-xs text-muted-foreground' }
  },
  defaultVariants: { strong: false }
})

/** Total d'une case détaillée : lecture seule (fond grisé), aligné comme une saisie. */
export const amountReadonly =
  'h-8 min-w-0 flex-1 rounded-md bg-muted/50 px-2 text-right leading-8 font-medium whitespace-nowrap tabular-nums'

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

/** Actions de ligne : « + » et menu « ⋯ », pleinement visibles au survol ou au clavier. */
export const rowActions =
  'flex items-center justify-end gap-0.5 opacity-40 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100'

/** En-tête de colonne de la synthèse (cliquable : ouvre la vue de la période). */
export const summaryHead = cva(
  'w-full rounded-lg px-2 py-1.5 text-right outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      active: { true: 'bg-accent text-accent-foreground', false: 'text-muted-foreground' }
    },
    defaultVariants: { active: false }
  }
)

/** Entrée du menu « ⋯ » d'une rangée (Modifier, Supprimer). */
export const menuItem = 'w-full justify-start'

/** Carte d'un total de l'année (lecture seule, pas cliquable). */
export const statCard = 'flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4 py-3'
