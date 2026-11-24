# Church Manager

Logiciel de gestion pour une église : application de bureau Windows, 100 % hors ligne.
Electron + React + TypeScript, données SQLite locales. Conventions et architecture : [CLAUDE.md](CLAUDE.md).

## Développement (macOS)

```bash
npm install
npm run dev            # application avec rechargement à chaud
npm run lint           # ESLint (frontières entre couches) + Prettier
npm run typecheck
npm test               # Vitest (lancé via Electron) ; --coverage pour les seuils
npm run build          # build electron-vite dans out/
npm run test:e2e:smoke # Playwright sur le build (faire `npm run build` avant)
npm run db:generate    # nouvelle migration après modification de src/main/db/schema.ts
npm run fixture:snapshot # à chaque release : fixture DB de non-régression
```

L'installeur Windows (`.exe`) est produit par la CI GitHub Actions sur un tag `vX.Y.Z`,
jamais depuis le Mac.

## Sur le PC de l'utilisateur

- Données : `%APPDATA%\Church Manager\data.db`, logs : `%APPDATA%\Church Manager\logs\`
- Sauvegardes automatiques : `Documents\Church Manager\Sauvegardes\` (14 dernières)
- Diagnostic : lancer l'exe avec `--debug` (F12 = outils de développement)
- Problèmes d'affichage (vieux pilote graphique) : lancer avec `--disable-gpu`
