# CLAUDE.md — Logiciel de gestion desktop (offline)

> Fichier de contexte + plan d'initialisation. À placer à la racine du repo.
> Claude Code le lit à chaque session : garder ce fichier à jour quand une décision change.
> **Priorités du projet, dans l'ordre : fiabilité des données > maintenabilité / debuggabilité > perf > nouvelles features.**

---

## 1. Contexte produit

- **Type** : logiciel de gestion pour l'église **FJKM Ambatondrazaka Fitiavana** (constante `CHURCH_NAME` dans `src/shared/domain/identity.ts`).
- **Métier** : règles de gestion et fonctionnalités **fournies par le porteur du projet**, module par module. Ne rien inventer ni coder de métier avant de les avoir reçues (cf. §14). Règles déjà reçues : §16.
- **Nom du logiciel** : « FJKM Ambatondrazaka Fitiavana » (`productName`, constante `APP_NAME`), `appId` : `mg.church.manager` (identifiant interne, invisible). **Ne plus changer `productName` ni `appId` après la première installation** : `productName` fixe les dossiers `%APPDATA%\<productName>` (données) et `Documents\<productName>\Sauvegardes`, `appId` l'identité Windows (raccourcis, désinstallation). Un test vérifie que `package.json`, `electron-builder.yml` et `APP_NAME` concordent.
- **Utilisateur** : non-technique. Il double-clique sur un `.exe`, point. Zéro dépendance à installer, zéro config, zéro base externe.
- **Mode** : 100 % offline, mono-poste, mono-utilisateur (pour l'instant).
- **Langue UI** : français. Formats `fr-FR` (dates, nombres, monnaie via `Intl`).

## 2. Contraintes cibles (NON négociables)

| Élément | Valeur |
|---|---|
| OS cible | Windows (version + 32/64 bits **à confirmer**, cf. §14) |
| CPU | Intel Core 2 Duo (SSE3 OK, pas d'AVX) |
| RAM | 4 Go (Windows en consomme déjà ~2 Go) |
| Disque | probablement HDD → démarrage à froid lent |
| Réseau | aucun |
| Machine de dev | macOS → **le .exe est buildé en CI Windows**, pas en local |

### Budget perf (à vérifier sur la vraie machine, pas sur le Mac)
- Démarrage à froid < 5 s, fenêtre visible immédiatement (pas d'écran blanc)
- RAM app < 300 Mo en usage normal
- Interaction (clic, saisie, filtre) < 100 ms
- Toute liste > 200 lignes : virtualisée

## 3. Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Runtime desktop | **Electron** (version stable actuelle) | 100 % TS, Chromium embarqué → aucune dépendance système, mature |
| Build tooling | **electron-vite** (`@quick-start/electron`, template `react-ts`) | Vite pour main/preload/renderer, HMR |
| Packaging | **electron-builder** → NSIS | `.exe` d'installation, raccourci bureau |
| UI | **React + TypeScript strict** | |
| Styles | **Tailwind CSS v4** + **shadcn/ui** (Radix) + **cva** | Composants dans le repo = 100 % personnalisables, theming via tokens CSS |
| Icônes | lucide-react | tree-shakable |
| Routing | react-router en **HashRouter** | `BrowserRouter` casse en prod (`file://`) |
| Data fetching UI | TanStack Query | états loading/error/cache/invalidation autour de l'IPC |
| Tableaux | TanStack Table + TanStack Virtual | listes lourdes sur CPU faible |
| Formulaires | react-hook-form + zod | |
| Toasts | sonner | |
| Base de données | **SQLite via better-sqlite3** (process main) | embarquée dans l'exe, synchrone, rapide, transactions triviales |
| ORM / migrations | **Drizzle ORM** + drizzle-kit | schéma typé, migrations SQL versionnées |
| Logs | electron-log | fichier de log local pour le debug terrain |
| Tests unit/intégration | **Vitest** (+ Testing Library pour le renderer) | |
| Tests E2E / non-régression | **Playwright** (support Electron) | parcours critiques sur l'app réelle |
| Qualité | ESLint (flat config) + Prettier + `prettier-plugin-tailwindcss` | |
| CI | GitHub Actions `windows-latest` | build natif Windows, sans Wine |

**Placement des dépendances** : seul ce qui doit rester externe au bundle main va dans `dependencies` (aujourd'hui **uniquement better-sqlite3**, natif). Tout le reste (React, TanStack, zod, drizzle-orm, electron-log…) est en `devDependencies` : electron-vite le bundle (tree-shaking) et electron-builder ne le recopie pas dans l'asar (19 Mo → 8 Mo, moins de résolution de modules au démarrage sur HDD).

**Exclus volontairement** : serveur local (Express, etc.), base externe, CDN (polices, scripts), Google Fonts, auto-update réseau, libs d'animation lourdes, conteneur d'injection de dépendances, state manager global (Redux…) tant qu'un vrai besoin n'est pas démontré.

---

## 4. Architecture en couches

### 4.1 Arborescence

```
src/
  shared/                     # TS PUR — aucune dépendance runtime sauf zod
    domain/                   # règles métier pures (calculs, invariants, AppError)
      <domaine>/
        <domaine>.types.ts
        <domaine>.rules.ts    # ex: computeInvoiceTotals(), canDecrementStock()
        <domaine>.rules.test.ts
      errors.ts               # AppError + codes d'erreur
    ipc/
      contract.ts             # canaux, schémas zod d'entrée, types de sortie
      result.ts               # Result<T>
    utils/                    # helpers purs génériques (money, dates)

  main/                       # process Node — seul à toucher DB, disque, OS
    index.ts                  # bootstrap app/fenêtre (fin, aucune logique)
    container.ts              # COMPOSITION ROOT : instancie et câble tout
    db/
      client.ts               # ouverture SQLite + pragmas
      schema.ts               # schéma Drizzle (source de vérité des tables)
      migrate.ts
    repositories/             # accès données UNIQUEMENT (requêtes Drizzle)
      <domaine>.repository.ts
    services/                 # cas d'usage : orchestration + transactions
      <domaine>.service.ts
    ipc/                      # contrôleurs : validation → service → Result
      handle.ts               # wrapper générique (validation, logs, erreurs)
      <domaine>.ipc.ts
    adapters/                 # SEUL endroit qui touche les API Electron/OS
      dialog.adapter.ts       # (dialog, shell, fs, print, clock…)
    logging/
      logger.ts
    backup/
      backup.service.ts

  preload/
    index.ts                  # contextBridge : expose window.api typé, rien d'autre

  renderer/src/
    app/                      # providers, router, layout, error boundaries
    lib/
      ipc-client.ts           # invoke typé : Result → throw IpcError (pour Query)
      query-client.ts
      error-messages.ts       # code d'erreur → message FR utilisateur
    styles/
      tokens.css              # SEUL endroit avec des valeurs brutes (couleurs, radius, espacements)
      globals.css             # @import tailwind, @theme (mappe tokens → utilitaires), base
      print.css
    components/
      ui/                     # composants shadcn (primitives)
      common/                 # composants transverses de l'app (DataTable, PageHeader…)
    features/
      <domaine>/
        api.ts                # appels ipc-client du domaine
        queries.ts            # query keys + hooks TanStack Query (useXxx, useCreateXxx)
        pages/                # CONTAINERS : branchent hooks ↔ composants
        components/           # PRÉSENTATIONNELS : props in, events out, zéro fetch
          xxx.tsx
          xxx.styles.ts       # variantes cva si le style n'est pas trivial
        forms/                # schémas de formulaire (réutilisent shared/domain)
        <domaine>.utils.ts    # helpers d'affichage purs

tests/
  factories/                  # builders de données (makeClient(), makeProduct()…)
  fixtures/
    db/                       # snapshots de DB réelles par version (v0.1.0.db…)
  integration/                # services + repositories sur SQLite en mémoire
  regression/                 # 1 fichier par bug corrigé
  e2e/                        # Playwright sur l'app Electron buildée
```

### 4.2 Règle de dépendance (sens unique)

```
renderer  ──►  shared  ◄──  main
                 ▲
             preload (types uniquement)

Dans main :   ipc ──► services ──► repositories ──► db
                          │
                          ├──► shared/domain (règles pures)
                          └──► adapters (Electron/OS)
Dans renderer : pages ──► queries ──► api ──► lib/ipc-client
                  │
                  └──► components (présentationnels) ──► components/ui
```

| Couche | Peut importer | Ne doit JAMAIS importer |
|---|---|---|
| `shared/**` | zod, `shared/**` | electron, react, drizzle, better-sqlite3, `node:*`, `main`, `renderer` |
| `main/repositories` | db, schema, shared | services, ipc, electron |
| `main/services` | repositories, shared/domain, adapters (via paramètres) | ipc, electron directement |
| `main/ipc` | services, shared/ipc | repositories, db |
| `main/adapters` | electron, `node:*` | services, repositories |
| `renderer/**` | shared, son propre code | `main/**`, electron, `node:*`, drizzle, better-sqlite3 |
| `features/*/components` | components/ui, components/common, utils | api, queries (pas de fetch dans un présentationnel) |
| `features/A` | `features/A`, components, lib | `features/B` (passer par `components/common` ou `shared`) |

**Ces règles sont vérifiées par ESLint** (`no-restricted-imports` par dossier dans `eslint.config.js`, zéro dépendance en plus). Une violation = CI rouge.

### 4.3 Où va quoi

| Je veux… | Ça va dans |
|---|---|
| Un calcul métier (TVA, total facture, marge, stock dispo) | `shared/domain/<domaine>/*.rules.ts` |
| Une requête SQL | `main/repositories` |
| Un enchaînement « vérifier → écrire plusieurs tables » | `main/services` (dans une transaction) |
| Valider une entrée venant de l'UI | schéma zod dans `shared/ipc/contract.ts` |
| Ouvrir un dialog, imprimer, lire un fichier | `main/adapters` |
| Charger / muter des données dans l'UI | `features/<domaine>/queries.ts` |
| Afficher des données | `features/<domaine>/components` |
| Couleur, rayon, espacement, police | `styles/tokens.css` |
| Variantes visuelles d'un composant | `xxx.styles.ts` (cva) |
| Formatage affichage (date, montant) | `shared/utils` ou `<domaine>.utils.ts` |

---

## 5. Design patterns retenus (et pourquoi)

> Principe : **patterns légers, explicites, sans framework.** Pas d'interface « au cas où », pas de classe abstraite sans 2e implémentation réelle, pas de DI container. Si un pattern ajoute de l'indirection sans gain de test ou de lisibilité, on ne le met pas.

| Pattern | Où | Gain concret |
|---|---|---|
| **Layered architecture** | tout le projet | chaque bug se localise par couche |
| **Pure domain functions** | `shared/domain` | règles métier testables en ms, réutilisables UI/main |
| **Repository** | `main/repositories` | SQL isolé, services lisibles, requêtes testables |
| **Service / Use case** | `main/services` | un cas d'usage = une méthode = une transaction |
| **Dependency injection par paramètres** (factory functions) | services, repositories | tests sans mock global, pas de magie |
| **Composition root** | `main/container.ts` | un seul endroit où tout est câblé |
| **Adapter** | `main/adapters` | Electron/OS remplaçables par des fakes en test |
| **Result type** | frontière IPC | erreurs typées, pas d'exception qui traverse l'IPC |
| **Controller mince + wrapper** | `main/ipc/handle.ts` | validation/logs/erreurs écrits une seule fois |
| **Container / Presentational** | renderer | composants d'affichage testables et réutilisables |
| **Custom hooks** | `queries.ts` | logique de données hors des composants |
| **Query key factory** | `queries.ts` | invalidation cohérente, pas de clés en string libres |
| **Builder / Factory de test** | `tests/factories` | données de test lisibles et maintenables |

### 5.1 Implémentations de référence

```ts
// shared/ipc/result.ts
export type ErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'BUSINESS_RULE' | 'INTERNAL'

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; details?: unknown } }
```

```ts
// shared/domain/errors.ts
import type { ErrorCode } from '../ipc/result'

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
```

```ts
// shared/ipc/contract.ts — source unique des canaux IPC
import { z } from 'zod'

export const ipcInputs = {
  'clients.list': z.object({
    search: z.string().trim().max(100).optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(50),
  }),
  'clients.create': z.object({ name: z.string().trim().min(1).max(120), phone: z.string().max(30).optional() }),
} satisfies Record<string, z.ZodType>

export interface IpcOutputs {
  'clients.list': Paginated<ClientDTO>
  'clients.create': ClientDTO
}

export type Channel = keyof typeof ipcInputs
export type IpcInput<C extends Channel> = z.input<(typeof ipcInputs)[C]>   // côté renderer
export type IpcParsed<C extends Channel> = z.output<(typeof ipcInputs)[C]> // côté main
```

> **Implémentation réelle (Phase 0)** : la liste des canaux vit dans `shared/ipc/channels.ts`, **sans zod**, car le preload sandboxé l'importe pour filtrer les canaux (et doit rester un bundle minimal). `contract.ts` vérifie à la compilation qu'il couvre exactement ces canaux. Les canaux sans entrée utilisent `z.undefined()` (`invoke('settings.get', undefined)`).
> `handle.ts` expose `runHandler()` (testable sans Electron) et `createHandle(ipcMain, logger)` ; tous les canaux sont enregistrés dans `main/ipc/register.ts`, appelé par `main/index.ts`.
> ESLint : `explicit-function-return-type` est désactivé pour les factories (`*.service.ts`, `*.repository.ts`, `container.ts`), les `queries.ts` et les tests, qui exportent des types inférés.

```ts
// main/ipc/handle.ts — UN seul wrapper pour tous les handlers
export function handle<C extends Channel>(
  channel: C,
  fn: (input: IpcParsed<C>) => IpcOutputs[C] | Promise<IpcOutputs[C]>,
): void {
  ipcMain.handle(channel, async (_event, raw: unknown): Promise<Result<IpcOutputs[C]>> => {
    const reqId = crypto.randomUUID().slice(0, 8)
    const start = performance.now()
    const parsed = ipcInputs[channel].safeParse(raw)

    if (!parsed.success) {
      logger.warn({ reqId, channel, issues: parsed.error.issues }, 'ipc validation failed')
      return { ok: false, error: { code: 'VALIDATION', message: 'Données invalides', details: parsed.error.issues } }
    }

    try {
      const data = await fn(parsed.data as IpcParsed<C>)
      logger.debug({ reqId, channel, ms: Math.round(performance.now() - start) }, 'ipc ok')
      return { ok: true, data }
    } catch (err) {
      if (err instanceof AppError) {
        logger.warn({ reqId, channel, code: err.code, details: err.details }, err.message)
        return { ok: false, error: { code: err.code, message: err.message, details: err.details } }
      }
      logger.error({ reqId, channel, err }, 'ipc unexpected error')
      return { ok: false, error: { code: 'INTERNAL', message: 'Erreur inattendue' } }
    }
  })
}
```

```ts
// main/services/sale.service.ts — DI par paramètres, une méthode = un cas d'usage
export function createSaleService(deps: {
  db: Db
  sales: SaleRepository
  stock: StockRepository
  clock: () => Date
}) {
  return {
    create(input: CreateSaleInput): SaleDTO {
      return deps.db.transaction((tx) => {
        const lines = deps.stock.getAvailability(tx, input.lines.map((l) => l.productId))
        const check = checkStockAvailability(input.lines, lines) // règle pure (shared/domain)
        if (!check.ok) throw new AppError('BUSINESS_RULE', 'Stock insuffisant', check.missing)

        const totals = computeSaleTotals(input.lines)              // règle pure
        const sale = deps.sales.insert(tx, { ...input, ...totals, createdAt: deps.clock() })
        deps.stock.decrement(tx, input.lines)
        return sale
      })
    },
  }
}
export type SaleService = ReturnType<typeof createSaleService>
```

```ts
// renderer/src/lib/ipc-client.ts — Result → exception, pour que TanStack Query gère l'état error
export class IpcError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly details?: unknown) {
    super(message)
  }
}

export async function invoke<C extends Channel>(channel: C, input: IpcInput<C>): Promise<IpcOutputs[C]> {
  const res = await window.api.invoke(channel, input)
  if (!res.ok) throw new IpcError(res.error.code, res.error.message, res.error.details)
  return res.data
}
```

### 5.2 Anti-patterns interdits
- Logique métier dans un composant React ou un handler IPC (calcul, règle, condition métier).
- SQL hors de `repositories/`.
- Import d'`electron` hors de `main/index.ts`, `main/ipc`, `main/adapters`, `preload`.
- `fetch`/`invoke` dans un composant présentationnel.
- « God component » : un fichier > ~250 lignes ou > 1 responsabilité → découper.
- Prop drilling sur > 2 niveaux → context **local à la feature**, pas global.
- `any`, `as` non justifié, `// @ts-ignore` (si vraiment nécessaire : `@ts-expect-error` + commentaire).
- `catch` vide ou `catch` qui avale l'erreur sans log.
- Dupliquer une règle métier côté UI : si l'UI a besoin d'un aperçu (total en temps réel), elle **importe la même fonction** depuis `shared/domain`.
- Abstraction prématurée : pas de généricité avant le 3e cas identique.

---

## 6. Styles (séparation CSS)

- **Tokens** (`styles/tokens.css`) : la seule source des valeurs brutes. Tout le reste référence des variables.
  Noms **alignés sur shadcn/ui** (`--background`, `--foreground`, `--primary`…) pour que les primitives shadcn marchent sans retouche.
  ```css
  :root {
    --background: oklch(0.985 0.003 85);
    --foreground: oklch(0.22 0.02 265);
    --primary: oklch(0.47 0.16 270);
    --radius: 0.5rem;
    --density: 1;            /* 0.85 compact | 1 confortable */
    --font-size-base: 14px;
  }
  [data-theme='dark'] { --background: oklch(0.19 0.012 265); --foreground: oklch(0.94 0.006 85); }
  [data-accent='green'] { --primary: oklch(0.5 0.12 160); }
  [data-density='compact'] { --density: 0.85; }
  ```
- **`globals.css`** : `@import "tailwindcss"`, `tw-animate-css`, `shadcn/tailwind.css`, puis `@theme inline` qui mappe les tokens vers les utilitaires (`--color-background: var(--background)`, `--spacing: calc(0.25rem * var(--density))` pour que toute l'échelle d'espacement suive la densité). Mode sombre : `@custom-variant dark` sur `[data-theme='dark']` (pas la classe `.dark` de shadcn). Pas de styles de composants.
- **shadcn/ui** : `components.json` écrit à la main (le CLI ne détecte pas electron-vite), style `radix-nova` (primitives Radix via le package `radix-ui`, helper `cn` via le package `cn`). Ajout : `npx shadcn add <composant> -y`. Les fichiers de `components/ui` sont à nous : on les adapte (ex. retirer les `transition-all`).
- **Composants** :
  - classes utilitaires pour la mise en page simple ;
  - dès qu'il y a des **variantes** (taille, état, intent) ou une liste de classes longue → `xxx.styles.ts` avec `cva`, importé par le composant ;
  - **interdit** dans le TSX : couleurs en dur (`#fff`, `bg-[#123]`), `style={{}}` hors valeurs réellement dynamiques (largeur calculée, position virtualisée).
- `print.css` séparé pour factures/reçus.
- Classes triées automatiquement par `prettier-plugin-tailwindcss` (diffs lisibles).

### Perf UI sur Core 2 Duo — à respecter
- ❌ `backdrop-filter`, `filter: blur`, grosses `box-shadow`, dégradés animés, effet verre
- ✅ transitions uniquement sur `transform` / `opacity`, ≤ 150 ms ; respecter `prefers-reduced-motion`
- Virtualiser les listes, paginer côté SQL (jamais tout charger pour filtrer en JS)
- Debounce des recherches (~200 ms), index SQL sur les colonnes filtrées / triées
- `React.lazy` par feature, pas de micro-découpage (lecture disque lente)
- Fenêtre : `show: false` + `ready-to-show` + `backgroundColor` du thème → pas de flash blanc
  - Implémenté : main lit `settings` avant de créer la fenêtre, passe `backgroundColor` (hex de `main/window-theme.ts`, seule exception justifiée aux valeurs brutes hors `tokens.css`) et les préférences dans l'URL ; `main.tsx` les applique sur `<html>` avant le premier rendu React.
- Typo : polices système uniquement (Segoe UI pour le texte, Cambria pour les titres, livrées avec Windows) → zéro fichier de police à charger.
- Option de secours si les vieux drivers GPU causent des glitches : lancer l'exe avec `--disable-gpu` (switch Chromium natif, à ajouter dans la cible du raccourci). Pas de réglage dans l'UI : il faudrait le lire avant `app.ready`, donc hors de la base.

---

## 7. Données

- Fichier DB : `app.getPath('userData')/data.db` (= `%APPDATA%\<productName>\`). **Jamais** dans le dossier d'installation.
- Pragmas à l'ouverture : `journal_mode = WAL`, `foreign_keys = ON`, `synchronous = NORMAL`, `busy_timeout = 5000`.
- Migrations : `npm run db:generate` (`drizzle-kit generate`) → SQL dans `drizzle/`, appliquées au démarrage. En prod : `process.resourcesPath/drizzle` (via `extraResources`).
  - Drizzle **0.45 stable** (pas la 1.0 beta). Le migrator better-sqlite3 est synchrone et applique toutes les migrations en attente dans **une seule transaction** ; suivi dans `__drizzle_migrations` (`created_at` = horodatage du journal).
  - `PRAGMA foreign_keys` est sans effet dans une transaction : `runMigrations()` lance `PRAGMA foreign_key_check` après coup et échoue s'il y a des orphelins.
  - **Une migration publiée n'est JAMAIS modifiée.** Correction = nouvelle migration.
  - Même règle pour une migration **déjà appliquée sur la base de dev** (`npm run dev` l'applique à `userData/data.db`) : la régénérer lui donne un nouvel horodatage, l'app la croit en attente et plante (`table already exists`). Avant de régénérer une migration non commitée, vérifier qu'aucun `npm run dev` ne l'a appliquée ; sinon, nouvelle migration.
  - Toute migration est couverte par le test de non-régression des données (§9.4).
  - Quand une table disparaît et qu'une autre apparaît, `drizzle-kit generate` demande en interactif s'il s'agit d'un renommage : le lancer dans un vrai terminal. `--custom` ne convient pas pour un changement de schéma (son snapshot recopie le précédent). Une reprise de données s'écrit à la main dans le SQL généré, **avant** son premier `npm run dev`, et se teste depuis une base de la version précédente (`migrationsUpTo()` de `tests/helpers/test-db.ts`).
- Montants : **entiers** dans la plus petite unité (pas de float). Dates : **TEXT ISO 8601 en UTC** (`2026-11-24T10:00:00.000Z`), produites par l'horloge injectée ; affichage en heure locale via `Intl` (`fr-FR`).
- Soft delete (`deleted_at`) pour les entités référencées (clients, produits).
- **Sauvegardes** :
  - auto au démarrage si la dernière a plus de 24 h → `Documents/<App>/Sauvegardes/`, rotation sur 14, via `sqlite.backup()` (safe en WAL) ;
  - **sauvegarde automatique avant chaque migration** (la plus critique) ;
  - export / restauration manuels depuis Paramètres (dialog natif). Restauration (`maintenance.service.ts`) : contrôle du fichier (`integrity_check`, tables attendues, schéma pas plus récent que l'app) → confirmation native → sauvegarde `avant-restauration` des données actuelles → fermeture DB → copie vers `data.db.restore-tmp`, suppression `-wal`/`-shm`, renommage → redémarrage (les migrations s'appliquent ensuite si la sauvegarde est plus ancienne).

---

## 8. Debuggabilité

- **Logs structurés** (electron-log, fichier dans `userData/logs`, rotation par taille) : chaque appel IPC loggue `reqId`, `channel`, durée, code d'erreur. Niveau `info` en prod, `debug` en dev.
- **Codes d'erreur stables** (`ErrorCode`) : le log contient le code + le contexte, l'UI affiche le message FR correspondant (`lib/error-messages.ts`). Un utilisateur qui rapporte « erreur BUSINESS_RULE stock » suffit à retrouver la cause.
- **Pas d'erreur silencieuse** : tout `catch` loggue ou relance.
- **Error Boundary par route** avec bouton « Copier les détails » (message, code, route, version de l'app).
- **Paramètres → Aide** : version de l'app, bouton « Ouvrir le dossier des logs » (`shell.openPath`), « Exporter une sauvegarde ».
- **Mode debug** : lancement avec l'argument `--debug` → DevTools disponibles + logs `debug`. Désactivé par défaut.
- Sourcemaps activées pour `main` et `preload` en prod (stack traces lisibles dans les logs).
- Fonctions courtes, noms explicites, pas d'effet de bord caché : une fonction de `shared/domain` ne lit ni horloge ni DB (on lui passe les valeurs → reproductible en test).
- `clock` injecté dans les services (jamais `new Date()` en dur dans un service) → bugs liés aux dates reproductibles.

---

## 9. Tests & non-régression

### 9.1 Pyramide

| Niveau | Cible | Outil | Environnement | Quand |
|---|---|---|---|---|
| Unitaire | `shared/domain`, utils | Vitest | node | chaque commit |
| Intégration | services + repositories + migrations | Vitest | SQLite en mémoire | chaque commit |
| Composants | composants présentationnels critiques, formulaires | Vitest + Testing Library | jsdom | chaque commit |
| Contrat IPC | schémas zod du contrat | Vitest | node | chaque commit |
| **E2E smoke** | parcours critiques | Playwright + Electron | app buildée | chaque PR |
| **Régression données** | migrations sur DB réelles des versions précédentes | Vitest | fixtures | chaque PR |
| E2E complet | tous les parcours | Playwright | CI Windows | chaque tag de release |

### 9.2 Configuration Vitest
- Un seul `vitest.config.ts` avec `test.projects` : `shared` (env node), `main` (env node), `renderer` (env jsdom).
- Vitest est lancé **via Electron** (même Node/V8 qu'en prod). better-sqlite3 ≥ 12 est en N-API avec binaires précompilés (`prebuilds/<os>-<arch>.node`) : plus de problème d'ABI, mais on garde la parité d'exécution :
  `"test": "cross-env ELECTRON_RUN_AS_NODE=1 electron ./node_modules/vitest/vitest.mjs run"`
- Tests d'intégration : `createTestDb()` = SQLite `:memory:` + **toutes les migrations réelles appliquées** (jamais un schéma recréé à la main).
- Couverture (seuils bloquants en CI) : `shared/domain` ≥ 90 %, `main/services` ≥ 80 %. Pas de seuil sur l'UI (on teste les comportements, pas les lignes).
- Pas de globals Vitest : `tests/setup/renderer.ts` appelle `cleanup()` de Testing Library. Pas de `@testing-library/jest-dom` (non listé) : on teste les propriétés DOM (`toHaveProperty('disabled', true)`).
- Factories : `tests/factories/*.factory.ts` sans dépendance DB (utilisables côté renderer), `*.seed.ts` pour écrire en base.
- **Base de démonstration** : `npm run seed:accounting` (projet Vitest `seed`, `scripts/seed-accounting.task.ts`, activé par `SEED_ACCOUNTING=1`) recrée `.dev-data/seed/data.db` (ignoré par git) avec le plan comptable réel du porteur (`tests/fixtures/accounting/church-plan-2025.ts`, budget 2025 : 107 rubriques, totaux [montant retiré] / [montant retiré] / 999 999 999 999). Les réalisations sont datées de façon déterministe sur 83 jours de 2025 (dimanches surtout), une sur quatre en 2 à 4 versements. Passe par le service (`tests/factories/accounting.seed.ts`), donc par toutes les règles ; vérifié par `tests/integration/accounting.seed.test.ts`. `npm run dev:seed` lance l'app sur cette base (`APP_USER_DATA`), sans toucher la base de dev habituelle.
- `npm run fixture:snapshot` est un projet Vitest dédié (`scripts/fixture-snapshot.task.ts`, activé par `FIXTURE_SNAPSHOT=1`) : mêmes alias, même runtime. Il refuse d'écraser une fixture existante et écrit un manifeste `v<version>.json` (lignes par table) que lit le test de migrations.

### 9.3 Règles de non-régression (obligatoires)
1. **Tout bug corrigé commence par un test qui le reproduit** et échoue, dans `tests/regression/<AAAA-MM-JJ>-<slug>.test.ts` (ou colocalisé si purement unitaire), avec un commentaire décrivant le bug. Ensuite seulement le correctif. Le test reste à vie.
2. **Golden tests sur les calculs métier** : jeux d'entrées/sorties figés (totaux de facture, remises, arrondis, stock) dans `shared/domain/**/__golden__/`. Un changement de résultat doit être explicite et justifié dans la PR.
3. **Parcours critiques en E2E smoke** (liste à maintenir ici) :
   - [x] Démarrage à vide → migrations OK → écran d'accueil (`tests/e2e/startup.spec.ts`)
   - [ ] Créer un client → apparaît dans la liste → recherche le retrouve
   - [ ] Créer une vente → stock décrémenté → total correct
   - [ ] Imprimer / générer le PDF d'une facture
   - [x] Sauvegarde manuelle → restauration → données identiques (`tests/e2e/backup.spec.ts`)
   - [x] Changer le thème → persisté après redémarrage (`tests/e2e/theme.spec.ts`)
   - [x] Comptabilité : arborescence 4 niveaux → 3 colonnes de montants → détail des saisies → totaux → vues mois/semaine/jour/personnalisée (calendrier) → rendu imprimé → suppression/renumérotation → persisté (`tests/e2e/accounting.spec.ts`)
4. **Aucun test supprimé ou désactivé** (`.skip`) sans justification écrite dans la PR.
5. Un test qui échoue de façon aléatoire (flaky) se corrige en priorité, il ne se relance pas en boucle.

### 9.4 Non-régression des données (spécifique desktop)
Les utilisateurs mettent à jour une DB existante, pas une DB neuve. Donc :
- À chaque release, `npm run fixture:snapshot` génère `tests/fixtures/db/v<version>.db` (données réalistes, anonymisées) à partir des factories.
- Le test `tests/regression/migrations.test.ts` : pour **chaque** fixture → copie → applique les migrations actuelles → vérifie le nombre de lignes par table, les invariants métier (somme des stocks, totaux des ventes) et l'absence de violations de clés étrangères (`PRAGMA foreign_key_check`).

### 9.5 E2E Playwright
- `@playwright/test` avec `_electron.launch()` sur le build `electron-vite build` (support Electron de Playwright = expérimental, suffisant pour nos parcours).
  Lancement : `_electron.launch({ args: ['.'] })` depuis la racine (pour que `app.getAppPath()` pointe sur la racine et trouve `drizzle/`). Helper : `tests/e2e/app.ts` (`launchApp()`). En E2E, les sauvegardes vont aussi dans le dossier temporaire.
- **Isolation** : chaque test lance l'app avec la variable `APP_USER_DATA=<dossier temporaire>` ; `main/index.ts` appelle `app.setPath('userData', …)` avant `ready`, **uniquement si `!app.isPackaged`**.
- Sélecteurs par rôle/label accessible (`getByRole`, `getByLabel`), `data-testid` en dernier recours. Jamais par classe CSS.
- Tag `@smoke` pour la suite rapide.

### 9.6 Conventions de test
- Données via factories (`makeClient({ name: 'Test' })`), pas d'objets copiés-collés.
- Un test = un comportement, nom en français lisible : `it('refuse la vente si le stock est insuffisant')`.
- Pas de mock de ce qu'on possède (repositories → vraie SQLite en mémoire). On fake uniquement les adapters (dialog, clock, fs).

---

## 10. Comportement app

- `app.requestSingleInstanceLock()` : une seule instance (deux process sur la même DB = corruption possible). 2e lancement → focus de la fenêtre existante.
- `webPreferences` : `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. CSP stricte dans `index.html`.
- Menu natif minimal (aucun sous Windows, Édition sur macOS), DevTools désactivés en prod (sauf `--debug`, F12). Navigation hors de l'app bloquée (`will-navigate`), liens externes ouverts dans le navigateur.
- `process.on('uncaughtException')` côté main → log + dialog ; Error Boundaries côté renderer.
- Impression / PDF : `webContents.print()` via `adapters/print.adapter.ts` (canal `app.print`, boîte de dialogue système : imprimante ou « Microsoft Print to PDF »). Mise en page dans `styles/print.css` : `data-print="hide"` (ne s'imprime pas), `data-print="only"` (imprimé seulement), tokens remappés en noir sur blanc quel que soit le thème, en-tête et total de tableau répétés à chaque page.

## 11. Build & distribution

### Local (Mac)
- `npm run dev` → dev quotidien.
- better-sqlite3 est natif mais livré précompilé en N-API (indépendant de la version d'Electron) : **aucune recompilation**. Le `postinstall` se limite à `install-electron` (téléchargement du binaire Electron, script d'install bloqué par défaut par npm 11). `electron-builder install-app-deps` a été retiré : il lançait une compilation node-gyp inutile.
- **Ne pas compter sur un build Windows depuis le Mac** (module natif + NSIS/Wine = fragile). Le `.exe` officiel sort de la CI.

### CI — `.github/workflows/ci.yml`
```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
    tags: ['v*']
jobs:
  quality:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run lint          # inclut les règles de frontières entre couches
      - run: npm run typecheck
      - run: npm test -- --coverage
      - run: npm run build         # electron-vite build
      - run: npm run test:e2e:smoke
      - if: startsWith(github.ref, 'refs/tags/v')
        run: npm run test:e2e
      - if: startsWith(github.ref, 'refs/tags/v')
        run: npm run build:win
      - if: startsWith(github.ref, 'refs/tags/v')
        uses: actions/upload-artifact@v4
        with:
          name: installer-windows
          path: dist/*.exe
```
- Branche `main` protégée : merge uniquement si la CI est verte.

### electron-builder (`electron-builder.yml`, points clés)
```yaml
appId: mg.<org>.<app>
productName: <NomApp>
asarUnpack:
  - "**/node_modules/better-sqlite3/**"
extraResources:
  - from: drizzle
    to: drizzle
win:
  target:
    - target: nsis
      arch: [x64]        # ia32 si Windows 32 bits (cf. §14)
  icon: build/icon.ico
nsis:
  oneClick: true
  perMachine: false       # pas besoin de droits admin
  createDesktopShortcut: always
  runAfterFinish: true
```
- Cible `portable` possible mais décompression dans `%TEMP%` à chaque lancement → lent sur HDD. NSIS préféré.
- Points ajoutés : `npmRebuild: false` (prebuilds N-API), `electronLanguages: [fr, en-US]` (installeur plus léger), `publish: null` (aucun auto-update), `deleteAppDataOnUninstall: false` (données conservées), seul le binaire SQLite de la cible est embarqué, `process.setSourceMapsEnabled(true)` dans main.
- CI : Node lu depuis `.nvmrc` (24), installeur généré par `electron-builder --win --publish never` après le build déjà fait, traces Playwright publiées en cas d'échec.
- Icône : `build/icon.ico` est encore celle du template Electron, **à remplacer**.
- Pas de signature de code au départ → avertissement SmartScreen au 1er lancement, à documenter pour l'utilisateur.
- VM Windows sur Mac Apple Silicon = ARM + émulation → **pas représentatif**. Valider chaque release sur le vrai PC.

## 12. Conventions de code

- TypeScript `strict: true` + `noUncheckedIndexedAccess`, pas de `any`.
- Nommage : fichiers `kebab-case` avec suffixe de rôle (`.service.ts`, `.repository.ts`, `.rules.ts`, `.ipc.ts`, `.adapter.ts`, `.styles.ts`), composants `PascalCase`, hooks `useXxx`.
- Un composant par fichier. Exports nommés (pas de `export default`, sauf si un outil l'impose).
- Imports via alias (`@shared/*`, `@main/*`, `@renderer/*`).
- Pas de nouvelle dépendance sans raison claire (poids + perf + maintenance). Vérifier la doc officielle à jour avant d'intégrer une lib.
- Commits conventionnels (`feat:`, `fix:`, `test:`, `refactor:`…). `fix:` sans test de régression = refusé en review. Tag `vX.Y.Z` = release.

## 13. Checklist avant de considérer une tâche terminée (Claude)

- [ ] Le code est dans la bonne couche (§4.3), `npm run lint` passe (frontières incluses)
- [ ] `npm run typecheck` passe
- [ ] Règle métier → test unitaire ; cas d'usage → test d'intégration ; bug → test de régression
- [ ] États loading / error / empty gérés à l'écran
- [ ] Erreurs : code `ErrorCode` approprié, loggées avec contexte
- [ ] Pas de valeur de style brute hors `tokens.css`
- [ ] Nouvelle table / colonne → migration générée + test migrations vert
- [ ] Parcours critique impacté → E2E smoke à jour
- [ ] Ce fichier mis à jour si une convention ou une décision a changé

## 14. Décisions à confirmer AVANT de coder

- [ ] **Version de Windows sur le PC cible** (`winver`) + **32 ou 64 bits**
  - Windows 10/11 64 bits → stack telle quelle
  - Windows 10 32 bits → build `ia32`, **mais better-sqlite3 ne fournit pas de binaire `win32-ia32`** : il faudra le compiler en CI (node-gyp, `--arch=ia32`) ou figer une version qui en fournit un
  - **Windows 7/8** → figer **Electron 22** (dernière version compatible) **et** passer à **Tailwind v3** (v4 nécessite un Chromium plus récent)
- [ ] Domaine métier exact + liste des entités v1
- [ ] Besoin d'impression (A4 ? ticket thermique ?)
- [ ] Monnaie et règles d'arrondi (hypothèse actuelle : Ariary, montants entiers ≥ 0, sans décimales ; à confirmer)

## 15. Plan d'initialisation (Phase 0)

> Claude : exécuter étape par étape, vérifier `npm run dev` + `npm test` après chaque étape, un commit par étape.

1. **Prérequis Mac** : Node LTS, Xcode Command Line Tools (`xcode-select --install`, pour compiler better-sqlite3).
2. **Scaffold** : `npm create @quick-start/electron@latest <app> -- --template react-ts`
3. **Structure & qualité** : arborescence §4.1 (dossiers vides + README d'une ligne si besoin), TS strict, alias, ESLint avec les **règles de frontières §4.2**, Prettier + plugin Tailwind. Vérifier qu'un import interdit fait échouer le lint.
4. **UI** :
   `npm i -D tailwindcss @tailwindcss/vite prettier-plugin-tailwindcss` → plugin dans la section `renderer` de `electron.vite.config.ts`
   `npx shadcn@latest init` (si le CLI ne détecte pas le projet, créer `components.json` à la main en pointant vers `src/renderer/src`)
   `npm i class-variance-authority lucide-react sonner react-router @tanstack/react-query @tanstack/react-table @tanstack/react-virtual react-hook-form @hookform/resolvers zod`
   → `tokens.css`, `globals.css`, `print.css` (§6).
5. **DB** : `npm i better-sqlite3 drizzle-orm electron-log` / `npm i -D drizzle-kit @types/better-sqlite3`
   → `db/client.ts`, `schema.ts` (table `settings`), `drizzle.config.ts`, 1re migration, migrator au démarrage (+ sauvegarde avant migration).
6. **Socle IPC** : `result.ts`, `errors.ts`, `contract.ts`, `handle.ts`, preload, `ipc-client.ts`, `container.ts`. Brancher `settings.get` / `settings.set` de bout en bout (repository → service → ipc → queries → page).
7. **Tests** : `npm i -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event jsdom cross-env @playwright/test`
   → `vitest.config.ts` (projects), `createTestDb()`, factories, 1 test par niveau (domain, intégration settings, composant, régression migrations, E2E smoke « démarrage à vide »).
8. **Shell app** : layout (sidebar + header), HashRouter, Error Boundary par route, toasts, thème clair/sombre + accent + densité lus depuis `settings`.
9. **Robustesse & debug** : single-instance lock, `ready-to-show`, logs structurés, `--debug`, sauvegarde auto, écran Paramètres (export/restauration, ouvrir les logs, version).
10. **Packaging** : `electron-builder.yml`, icône `.ico`, workflow CI §11, tag `v0.1.0` → `.exe` → **test sur le vrai PC** (démarrage, RAM dans le Gestionnaire des tâches, fluidité). Générer la 1re fixture `tests/fixtures/db/v0.1.0.db`.

**Ne pas commencer les features métier avant que l'étape 10 soit validée sur la machine cible.**

> **État (2026-11-24)** : module Comptabilité ajouté (§16.1) à la demande du porteur, avant validation de l'étape 10 sur le vrai PC. Étapes 1 à 10 faites sur le Mac (lint, typecheck, 60 tests, 4 E2E, build, fixture `v0.1.0`). Reste : pousser sur GitHub, CI verte, tag `v0.1.0`, test du `.exe` sur le vrai PC. Note : Vitest est installé dès l'étape 3 (pour que `npm test` existe à chaque étape).

## 16. Règles métier reçues

### 16.1 Comptabilité (`features/accounting`, reçue le 2026-11-24 ; arborescence, montants, dates d'opération et vues par période ajoutées le même jour)

UI en français d'abord ; les termes malgaches sont gardés en glossaire (traduction prévue plus tard).

| Français (UI / code) | Malgache | Sens |
|---|---|---|
| Numéro (`code`) | Laharana, « Lah. » | `F1`, `F1-II`, `F1-II-1`, `F1-II-1 A)` |
| Description | Antony | texte saisi |
| Rubrique / sous-rubrique (`item`) | ex. « ANATINY », « Mpitandrina » | élément de l'arbre |
| Saisie (`entry`) | | un montant daté, avec libellé facultatif |

- **Arborescence sur 4 niveaux** (`accounting_items`, `parent_id`). Numéros calculés, jamais stockés (`shared/domain/accounting/accounting.codes.ts`, golden `__golden__/codes.json`) :
  - niveau 1 : lettre de l'**alphabet malgache** (21 lettres, sans C, Q, U, W, X ; puis AA, AB…) + rang dans la lettre : `F1`. La lettre est automatique : une lettre déjà utilisée (→ F2) ou la suivante proposée ; le service refuse toute autre (`availableLetters`), la base aussi (CHECK) ;
  - niveau 2 : **groupe** (a des sous-rubriques) en chiffres romains `F1-I`, `F1-II` ; **rubrique à montant** en chiffres arabes `A1-1`, `A1-2` ; deux rangs séparés (règle du document de l'église, confirmée le 2026-11-24). Une sous-rubrique de niveau 2 démarre donc en `A1-3` et devient `A1-I` dès qu'elle reçoit un enfant (ses sœurs sont renumérotées) ;
  - niveau 3 : chiffres `F1-II-1`, groupes et rubriques à montant dans la même suite (`F1-II-1` à `F1-II-6`) ; niveau 4 : lettres malgaches `F1-II-1 A)`, `B)`, `D)`… Pas de 5e niveau.
  - le seed vérifie que les 107 numéros calculés sont exactement ceux du document (`tests/integration/accounting.seed.test.ts`).
- Les numéros découlent de `position` parmi les frères actifs (même parent ; au niveau 1, même lettre). Suppression ou ↑ ↓ → renumérotation sans trou ; les montants suivent l'élément (liés à son id). Pas de changement de parent.
- **Groupe ou montant, sans type stocké** : un élément qui a des enfants est un groupe (pas de montant) ; un élément sans enfant porte des montants, **à tous les niveaux** (une rubrique principale sans sous-rubrique aussi). Refus (`BUSINESS_RULE`) : enfant sous un élément qui a des saisies (toutes années), montant sur un groupe.
- Description du niveau 1 toujours en **MAJUSCULES** (`normalizeDescription`) ; autres niveaux : casse saisie.
- **3 colonnes pour l'année affichée N** : Estimation N, Réalisation N, Estimation N+1. La 3e est l'estimation de l'année N+1 (un seul chiffre, `columnTarget`). En 2200 (`MAX_YEAR`), elle est désactivée.
- **Saisies** (`accounting_entries` : `year`, `type` `estimate`|`actual`, `amount` entier ≥ 0, `label` facultatif, `operated_on`, `created_at`, `updated_at`, `deleted_at`). Le montant d'une case = somme des saisies actives (`cellOf`), plafonnée à `MAX_AMOUNT`.
  - **Date d'opération** (`operated_on`, « AAAA-MM-JJ », date du calendrier sans fuseau) : obligatoire pour une réalisation et dans l'année de la case, absente pour une estimation (annuelle). Contrôlée par `operationDateError` (service, `VALIDATION`) et par un CHECK SQL. Par défaut : aujourd'hui ramené dans l'année (`defaultOperationDate` : 31 décembre pour une année passée, 1er janvier pour une année future). Un total direct garde sa date quand on le modifie.
  - Case **simple** (0 saisie, ou 1 sans libellé) : saisie directe dans le tableau ; modifier garde la date de création ; vider = suppression douce.
  - Case **détaillée** (libellé ou ≥ 2 saisies) : total en lecture seule ; modifications dans le panneau de détail (libellé, montant, date et heure de création et de modification ; ajout, modification, suppression confirmée).
- **Vues** (`?vue=` dans l'URL) : **Année** (3 colonnes, modifiable) ; **Mois**, **Semaine** (lundi au dimanche), **Jour** : même arbre, une colonne « Réalisations » = somme des réalisations dont la date d'opération tombe dans la période (`accounting.periodTotals`, `accounting.periods.ts`), lecture seule, navigation précédente / suivante. **Personnalisé** : champs Du / Au, période de n'importe quelle durée, l'autre borne suit si l'ordre est inversé.
- **Calendrier** (champs Du / Au, date d'opération) : composant maison `components/common/DateField.tsx` + `Calendar.tsx` (Popover Radix, grille `monthGrid`), en français, semaines du lundi au dimanche, mois / année en listes, clavier (flèches, Page préc. / suiv., Entrée), bornes min / max. Pas de bibliothèque de calendrier (refusée à l'installation, et non nécessaire).
- **Impression** : bouton « Imprimer » dans chaque vue ; imprime le tableau affiché (rubriques, montants, sous-totaux, total) sous un en-tête « <église> : comptabilité · <vue> · Imprimé le … », sans la barre d'outils, les actions, les boutons de détail ni les formulaires.
- Saisie des montants : toujours groupés par 3 avec une espace insécable de largeur normale (`2 000 000`, U+00A0, `formatAmount`), **y compris pendant la frappe** (`lib/money-input.ts`) : seuls les chiffres sont acceptés, le curseur reste en place, Retour arrière sur une espace efface le chiffre voisin. Entrée = enregistre et passe à la case suivante.
- Suppression douce (`deleted_at`) ; supprimer un élément supprime toute sa descendance. Confirmation obligatoire dans l'UI.
- Migration `0002` (SQL de reprise écrit à la main dans le fichier généré) : anciennes rubriques → niveau 1, anciennes lignes → niveau 2, anciens montants → saisies « réalisation » sans libellé. Migration `0003` : date d'opération des réalisations existantes = date de saisie si elle tombe dans l'année de la case, sinon 31 décembre.
- **Totaux** (demandés le 2026-11-24) : chaque groupe affiche, par colonne, la somme de toute sa descendance (lecture seule) ; ligne « Total général » (vue Année, 3 colonnes) ou « Total » (vues par période) en pied de tableau. Calcul pur `rollUp` (`accounting.totals.ts`), fait à l'écran pour suivre chaque saisie immédiatement ; `null` (case vide) si aucune rubrique concernée n'a de montant, 0 est un montant.
- Tableau non virtualisé : un plan comptable reste sous 200 lignes. À virtualiser s'il dépasse (§2).
