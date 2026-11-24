# Church Manager

Logiciel de gestion de l'église **FJKM Ambatondrazaka Fitiavana**.

Application de bureau Windows, **100 % hors ligne** : l'utilisateur double-clique sur un `.exe`, sans rien
installer d'autre ni se connecter à internet. Les données restent sur le PC (base SQLite locale) et
sont sauvegardées automatiquement chaque jour.

> Les fonctionnalités métier (membres, finances, etc.) seront ajoutées une fois les règles de gestion
> fournies. La version actuelle (0.1.0) est le socle technique : accueil, paramètres d'apparence,
> sauvegardes et restauration.

Architecture, conventions et règles du projet : [CLAUDE.md](CLAUDE.md).

## Technologies

| Rôle                   | Technologie                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Application de bureau  | [Electron](https://www.electronjs.org/) 44 (Chromium embarqué, aucune dépendance système) |
| Build et rechargement  | [electron-vite](https://electron-vite.org/) 6 (Vite 8)                                    |
| Installeur Windows     | [electron-builder](https://www.electron.build/) (NSIS)                                    |
| Interface              | React 19 + TypeScript (mode strict)                                                       |
| Styles et composants   | Tailwind CSS v4, shadcn/ui (Radix UI), class-variance-authority, icônes lucide-react      |
| Navigation             | React Router 8 (HashRouter)                                                               |
| Données côté interface | TanStack Query (et TanStack Table / Virtual pour les grandes listes)                      |
| Formulaires            | react-hook-form + zod                                                                     |
| Notifications          | sonner                                                                                    |
| Base de données        | SQLite via better-sqlite3 13                                                              |
| Schéma et migrations   | Drizzle ORM 0.45 + drizzle-kit                                                            |
| Validation             | zod 4 (contrat entre l'interface et le process principal)                                 |
| Logs                   | electron-log (fichier local, rotation)                                                    |
| Tests                  | Vitest 5 (+ Testing Library, jsdom), Playwright (tests de bout en bout sur Electron)      |
| Qualité                | ESLint 9 (règles de frontières entre couches), Prettier                                   |
| Intégration continue   | GitHub Actions sur `windows-latest`                                                       |

## Prérequis (poste de développement)

- **Node.js 24** (version dans `.nvmrc` ; avec nvm : `nvm use`)
- **Git**
- macOS : Xcode Command Line Tools (`xcode-select --install`)
- Windows : rien de plus (better-sqlite3 est livré précompilé)

## Démarrer en développement

```bash
npm install     # installe les dépendances et télécharge Electron
npm run dev     # lance l'application avec rechargement à chaud
```

En développement, les données sont dans le dossier `userData` d'Electron :

- macOS : `~/Library/Application Support/Church Manager/`
- Windows : `%APPDATA%\Church Manager\`

Pour travailler sur des données jetables, lancer avec un dossier dédié (ignoré dans l'app installée) :

```bash
APP_USER_DATA=/tmp/church-dev npm run dev
```

## Vérifier avant de committer

```bash
npm run lint            # ESLint + Prettier, frontières entre couches comprises
npm run typecheck       # TypeScript (process principal et interface)
npm test                # tests unitaires, intégration, composants, non-régression
npm test -- --coverage  # idem avec les seuils de couverture (bloquants en CI)
npm run build           # build de production dans out/
npm run test:e2e:smoke  # parcours critiques sur l'app buildée (après npm run build)
npm run test:e2e        # tous les tests de bout en bout
```

`npm run format` reformate tout le code.

## Base de données

```bash
# 1. modifier src/main/db/schema.ts
npm run db:generate     # 2. génère la migration SQL dans drizzle/
npm test                # 3. le test de migrations vérifie les bases des versions précédentes
```

Une migration publiée n'est **jamais** modifiée : une correction = une nouvelle migration.
Les migrations s'appliquent au démarrage, après une sauvegarde automatique de la base.

À chaque release, **avant** de modifier le schéma pour la version suivante :

```bash
npm run fixture:snapshot   # crée tests/fixtures/db/v<version>.db (non-régression des données)
```

## Construire l'installeur Windows

### Méthode officielle : la CI GitHub (depuis le Mac)

Le `.exe` n'est **pas** construit sur le Mac (module natif + NSIS : peu fiable). Il est produit par
GitHub Actions sur une machine Windows :

```bash
# mettre à jour "version" dans package.json, committer, puis :
git tag v0.1.0
git push origin main --tags
```

Sur un tag `v*`, la CI lance toutes les vérifications, les tests de bout en bout complets, puis
génère l'installeur. Le télécharger dans GitHub : onglet **Actions** → le run du tag → artefact
**installer-windows** (`church-manager-<version>-setup.exe`).

### Sur un PC Windows de développement

```bash
npm install
npm run build:win        # → dist/church-manager-<version>-setup.exe
```

### Build de contrôle sur macOS (non distribué)

```bash
npm run build:unpack     # application non empaquetée dans dist/, pour vérifier le packaging
```

## Installation et utilisation sur le PC de l'église

- Lancer `church-manager-<version>-setup.exe` : installation sans droits administrateur, raccourci
  créé sur le bureau. L'exe n'est pas signé : au premier lancement, Windows SmartScreen affiche un
  avertissement (« Informations complémentaires » → « Exécuter quand même »).
- Données : `%APPDATA%\Church Manager\data.db`
- Logs : `%APPDATA%\Church Manager\logs\` (aussi accessibles via **Paramètres → Aide**)
- Sauvegardes automatiques : `Documents\Church Manager\Sauvegardes\` (les 14 dernières)
- Export et restauration d'une sauvegarde : **Paramètres → Sauvegardes**
- Désinstaller ne supprime ni les données ni les sauvegardes.

### Dépannage

- **Mode diagnostic** : lancer l'exe avec `--debug` (F12 ouvre les outils de développement, logs détaillés).
- **Problèmes d'affichage** (vieux pilote graphique) : ajouter `--disable-gpu` à la cible du raccourci.
- En cas d'erreur à l'écran : bouton **Copier les détails**, à transmettre avec le fichier de log.

## Structure du projet

```
src/
  shared/     règles métier pures, contrat IPC (zod), utilitaires : sans dépendance Electron
  main/       process Node : base de données, services, IPC, sauvegardes, logs
  preload/    pont sécurisé : expose uniquement window.api.invoke()
  renderer/   interface React (app/, features/, components/, styles/)
drizzle/      migrations SQL versionnées
tests/        intégration, non-régression, fixtures de bases, E2E Playwright
```
