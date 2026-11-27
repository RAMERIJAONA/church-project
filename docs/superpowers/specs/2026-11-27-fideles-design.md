# Gestion des fidèles : conception

Date : 2026-11-27. Statut : en attente d'approbation du porteur.

## 1. Intention

L'église a besoin d'un registre de ses fidèles dans le logiciel : ajouter, modifier, supprimer
un fidèle, et le retrouver vite en tapant une partie de son nom, même avec une faute de frappe.
Les noms sont toujours enregistrés au même format, quelle que soit la saisie, pour que la liste
reste propre et que la recherche soit fiable.

**Module indépendant de la Comptabilité** (précision du porteur, 2026-11-27) : aucun lien de
données, aucun import entre `features/members` et `features/accounting`, ni entre
`shared/domain/members` et `shared/domain/accounting`. Seule l'organisation du code (couches,
conventions) est la même. Les helpers de date génériques dont les deux ont besoin
(`localDateOf`, `isCalendarDate`) passent dans `shared/utils/dates.ts`.

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Nouvelle section « Fidèles » dans le menu (`/fideles`).
- Ajouter, modifier, supprimer (avec confirmation) un fidèle.
- Liste triée par nom puis prénom, paginée.
- Barre de recherche en temps réel, tolérante aux fautes, sur nom, prénom et matricule.
- Normalisation automatique : nom en MAJUSCULES, prénom « Rakoto Tiana », téléphone affiché
  `034 12 345 67`.

**Non-objectifs (pour cette version)**
- Liste des secteurs et écran de gestion des secteurs (prévus plus tard, cf. par. 4.4).
- Impression et export Excel de la liste.
- Import depuis un fichier existant.
- Familles, liens entre fidèles, historique, photos.

**Anti-objectifs (échec même si « ça marche »)**
- Une recherche qui rame sur le Core 2 Duo (au-delà de 100 ms entre la frappe et le résultat,
  debounce compris hors).
- Une donnée réelle de fidèle dans le repo (public) : fixtures, seed et tests toujours fictifs.
- Une perte de données : suppression douce, migration couverte par le test de non-régression.

## 3. Règles métier reçues (porteur, 2026-11-27)

| Champ | Obligatoire | Règle |
|---|---|---|
| Nom | oui | toujours enregistré en MAJUSCULES (`rakoto` → `RAKOTO`) |
| Prénom | oui | chaque mot avec une majuscule initiale, le reste en minuscules (`rAkoto TiaNa` → `Rakoto Tiana`) |
| Date de naissance | oui | saisie par calendrier |
| Adresse | oui | texte libre |
| Téléphone | non | format malgache ; saisie `+261 34 12 345 67` ou `034 12 345 67` acceptée ; **affichage toujours `034 12 345 67`** |
| Secteur | non | texte libre pour l'instant ; deviendra une liste déroulante alimentée par une section « Secteurs » |
| Baptême | non (Oui / Non) | |
| Membre communiant | non (Oui / Non) | |
| Numéro matricule | non | texte ; **deux fidèles ne peuvent pas avoir le même** |

Règles complémentaires (porteur, 2026-11-27) :

- **Un membre communiant est toujours baptisé** : « Communiant : Oui » impossible avec
  « Baptême : Non ».
- **Nom et prénom uniques** (porteur, 2026-11-27, après la première version) : deux fidèles actifs
  ne portent jamais exactement le même nom et prénom, quelle que soit la date de naissance ;
  refus bloquant (`CONFLICT`, `name-taken`), qui **remplace** l'avertissement ci-dessous.
- **Seul le tableau de la liste défile** (porteur, 2026-11-27) : titre, recherche et nombre de
  fidèles restent fixes.
- *(Remplacé)* **Doublon probable** : même nom, même prénom et même date de naissance qu'un fidèle actif →
  avertir (« Un fidèle RAKOTO Tiana né le 12/03/1985 existe déjà. Ajouter quand même ? »),
  sans bloquer.

Correction acceptée par le porteur : l'exemple initial `+261 3X XXX XX` avait 7 chiffres ; un
numéro malgache en a 9 après `+261` (10 avec le `0` local).

## 4. Conception

### 4.1 Approches considérées pour la recherche

| | Approche | Gain | Coût | Choix |
|---|---|---|---|---|
| A | Recherche en base (`LIKE` sur une forme sans accents ni majuscules) | simple, tient à n'importe quel volume | « rakto » ne trouve pas « RAKOTO » : ne répond pas à la demande | écartée |
| **B** | **Index en mémoire dans le process main + score approché (fonction pure)** | **tolère 1 à 2 fautes, classe les résultats, < 10 ms jusqu'à quelques milliers de fidèles** | **déroge à « jamais tout charger pour filtrer en JS » (par. 6 du CLAUDE.md)** | **retenue par le porteur** |
| - | FTS5 de SQLite (tokenizer trigram) | accélère les sous-chaînes | ne tolère pas les fautes | écartée |
| - | Extension `spellfix1` | fautes gérées en SQL | non livrée avec better-sqlite3, compilation native par plateforme | écartée |

Limite de B : pensée pour moins de 10 000 fidèles environ. Au-delà, à revoir.

Justification de la dérogation (à reporter dans le CLAUDE.md) : la règle vise à ne pas envoyer
toute une table au renderer. Ici, seul le process main garde un index compact (id + formes
normalisées du nom, du prénom et du matricule, environ 100 Ko pour 2 000 fidèles) ; le renderer
ne reçoit que la page affichée.

### 4.2 Données : table `members` (migration `0006`)

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | INTEGER PK autoincrement | |
| `last_name` | TEXT NOT NULL | déjà normalisé (MAJUSCULES) |
| `first_name` | TEXT NOT NULL | déjà normalisé (« Rakoto Tiana ») |
| `birth_date` | TEXT NOT NULL | `AAAA-MM-JJ`, date du calendrier sans fuseau (comme `operated_on`) |
| `address` | TEXT NOT NULL | |
| `phone` | TEXT NULL | forme canonique `+261XXXXXXXXX` (12 caractères) |
| `sector` | TEXT NULL | |
| `baptized` | INTEGER NOT NULL DEFAULT 0 | 0 / 1, CHECK |
| `communicant` | INTEGER NOT NULL DEFAULT 0 | 0 / 1, CHECK ; CHECK de table `communicant = 0 OR baptized = 1` (table neuve : pas de recréation à craindre) |
| `registration_number` | TEXT NULL | matricule, espaces de début et de fin retirés |
| `created_at`, `updated_at` | TEXT NOT NULL | ISO UTC, horloge injectée |
| `deleted_at` | TEXT NULL | suppression douce |

Index :
- `members_name_idx` sur (`last_name`, `first_name`) : tri de la liste. Remplacé en `0007` par
  `members_name_unique_idx` (unique, fidèles actifs) : nom et prénom uniques, et tri.
- `members_registration_number_idx` : index **unique partiel** sur `registration_number`
  insensible à la casse (`COLLATE NOCASE`), `WHERE registration_number IS NOT NULL AND
  deleted_at IS NULL`. Le matricule d'un fidèle supprimé redevient disponible.

Nouvelle table sans reprise de données : migration générée par `drizzle-kit generate`, aucun SQL
écrit à la main. Une sauvegarde plus ancienne restaurée reçoit la table à la migration suivante.

### 4.3 Règles pures : `shared/domain/members/`

- `members.types.ts` : `MemberDTO`, schémas zod d'entrée (`createMemberInputSchema`,
  `updateMemberInputSchema`, `listMembersInputSchema`), `Paginated<T>`.
- `members.rules.ts` :
  - `normalizeLastName(s)` : espaces en trop retirés, `toLocaleUpperCase('fr-FR')`.
  - `normalizeFirstName(s)` : espaces en trop retirés ; majuscule initiale après un début, une
    espace, un trait d'union ou une apostrophe (`jean-pierre` → `Jean-Pierre`), reste en
    minuscules.
  - `parsePhone(s)` → `+261XXXXXXXXX` ou erreur : on garde les chiffres ; `261` en tête ou `0`
    en tête retiré ; il doit rester **9 chiffres commençant par 2 ou 3** (mobiles 32, 33, 34,
    37, 38 et fixes 20). Champ vide → `null`.
  - `formatPhone(canonical)` → `034 12 345 67`.
  - `birthDateError(date, today)` : date réelle, pas dans le futur, pas avant 1900.
  - `communicantError(baptized, communicant)` : communiant sans baptême refusé.
- `members.search.ts` (fonction pure, testée par des golden tests `__golden__/search.json`) :
  - `normalizeForSearch(s)` : minuscules, accents retirés (NFD), ponctuation en espace.
  - `searchMembers(index, query)` → ids classés. Chaque mot tapé doit correspondre à au moins un
    mot du nom, du prénom ou du matricule (ET entre les mots tapés). Score par mot, du meilleur au
    moins bon : mot identique, début de mot, contenu dans le mot (2 lettres et plus, porteur 2026-11-27), approché (distance de
    Damerau-Levenshtein ≤ 1 pour un mot tapé de 4 à 7 lettres, ≤ 2 à partir de 8 ; aucun
    approché sous 4 lettres ; contre le début d'un mot plus long, seulement à partir de 5 lettres :
    « rakto » trouve RAKOTOMALALA, « rako » ne trouve pas RASOA ; ajouté après la relecture finale). Matricule : début et contenu seulement, pas d'approché.
    Ex æquo : tri par nom puis prénom.

Les mêmes fonctions de normalisation servent au formulaire (aperçu à la sortie du champ) et au
service (vérité), conformément au par. 5.2 du CLAUDE.md.

### 4.4 Process main

- `repositories/members.repository.ts` : `insert`, `update`, `softDelete`, `findById`,
  `findByIds`, `listPage(offset, limit)`, `count()`, `searchIndexRows()` (id, nom, prénom,
  matricule des fidèles actifs), `findActiveByRegistrationNumber`.
- `services/members.service.ts` (`createMembersService({ db, members, clock })`) :
  - `create`, `update` : normalisation, contrôles, matricule déjà pris → `CONFLICT`
    (« Ce matricule est déjà attribué à RAKOTO Tiana »), date invalide ou téléphone invalide →
    `VALIDATION`, communiant sans baptême → `BUSINESS_RULE`.
  - Doublon probable (même nom et prénom normalisés, même date de naissance, fidèle actif autre
    que celui modifié) : l'entrée porte `confirmDuplicate` (booléen, `false` par défaut) ; sans
    confirmation, le service lève `CONFLICT` avec `details: { reason: 'possible-duplicate',
    existing: MemberDTO }` et n'écrit rien ; l'UI demande confirmation puis renvoie avec
    `confirmDuplicate: true`. Vaut à l'ajout **et** à la modification (mon choix : une
    modification peut aussi créer un doublon), mais en modification seulement si le nom, le prénom
    ou la date de naissance changent (un homonyme déjà accepté n'est pas redemandé). Le matricule en double reste, lui, bloquant
    (`details.reason: 'registration-number-taken'`).
  - `delete` : suppression douce ; fidèle introuvable → `NOT_FOUND`.
  - `list({ search, page, pageSize })` : sans recherche, page SQL triée ; avec recherche,
    `searchMembers` sur l'index puis `findByIds` sur la page demandée, dans l'ordre du score.
  - Index en mémoire construit au premier `list` avec recherche, reconstruit après chaque
    `create`, `update`, `delete` (quelques ms) et après une restauration (l'app redémarre).
- `ipc/members.ipc.ts` : canaux `members.list`, `members.create`, `members.update`,
  `members.delete` (ajoutés à `channels.ts` et `contract.ts`).
- Secteurs, plus tard : table `sectors` + colonne `sector_id`, migration qui crée un secteur par
  valeur texte distincte existante. Le champ texte actuel garde donc sa valeur exacte (espaces
  retirés seulement) pour que cette reprise soit possible.

### 4.5 Écran : `features/members`

Nouvelle entrée de menu « Fidèles » (icône `Users`), entre Accueil et la section Comptabilité.

```
Fidèles                                          [ + Ajouter un fidèle ]
[ 🔍 Rechercher par nom, prénom ou matricule…                     ]
  1 248 fidèles                         (ou « 3 résultats pour « rakto » »)
┌──────────┬──────────────┬────────────┬───────────────┬─────────┬────────┬────────────┬──────────┬───┐
│ Nom      │ Prénom       │ Naissance  │ Téléphone     │ Secteur │ Baptisé│ Communiant │ Matricule│   │
├──────────┼──────────────┼────────────┼───────────────┼─────────┼────────┼────────────┼──────────┼───┤
│ RAKOTO   │ Tiana        │ 12/03/1985 │ 034 12 345 67 │ Nord    │ Oui    │ Non        │ M-0042   │ ⋯ │
│          │ Lot II A 45, Ambatondrazaka (adresse, petit et gris)                                 │   │
└──────────┴──────────────┴────────────┴───────────────┴─────────┴────────┴────────────┴──────────┴───┘
                                       ‹ Précédent   Page 1 sur 25   Suivant ›
```

- Recherche : debounce 200 ms, résultats classés par pertinence ; recherche vide = liste triée par
  nom. 50 fidèles par page (sous le seuil de 200 lignes : pas de virtualisation).
- Menu « ⋯ » de la ligne : Modifier, Supprimer (comme `RowActions` de la comptabilité).
  Suppression : boîte de confirmation « Supprimer RAKOTO Tiana ? ».
- Formulaire dans une boîte de dialogue (ajout et modification) : react-hook-form + zod,
  `DateField` pour la date de naissance (max = aujourd'hui), Oui / Non par `SegmentedControl`,
  téléphone formaté pendant la frappe (même principe que `lib/money-input.ts`), nom et prénom
  normalisés à la sortie du champ. « Communiant : Oui » désactivé tant que « Baptême » vaut Non,
  avec l'aide « Un membre communiant est toujours baptisé » ; repasser Baptême à Non remet
  Communiant à Non. Doublon probable : boîte de confirmation « Ajouter quand même » /
  « Annuler ». Erreurs de validation sous chaque champ ; `CONFLICT` du
  matricule affiché sous le champ matricule.
- États : chargement, erreur (message FR + réessayer), liste vide (« Aucun fidèle enregistré » +
  bouton d'ajout), recherche sans résultat.
- Toasts : « Fidèle ajouté », « Modifications enregistrées », « Fidèle supprimé ».

### 4.6 Tests

- Unitaires : normalisation nom / prénom, téléphone (parse et affichage), date de naissance,
  golden tests de la recherche (fautes, accents, ordre, matricule).
- Intégration (`tests/integration/members.service.test.ts`) : création normalisée, matricule en
  double refusé (casse comprise), communiant sans baptême refusé (service et CHECK SQL), doublon
  probable signalé puis accepté avec confirmation, matricule libéré après suppression, pagination, recherche
  approchée, index à jour après modification et suppression.
- Composants : formulaire (champs obligatoires, aperçu de normalisation, téléphone).
- Régression données : `migrations.test.ts` couvre `0006` sur la fixture `v0.1.0`.
- E2E smoke `tests/e2e/members.spec.ts` : créer un fidèle → il apparaît dans la liste → la
  recherche avec une faute le retrouve → modifier → supprimer.
- Données fictives : `tests/factories/members.factory.ts` ; quelques centaines de fidèles fictifs
  par une commande à part, `npm run seed:members` (ne touche pas aux données de comptabilité) ;
  10 000 depuis le 2026-11-27, aux noms et prénoms tous différents.

### 4.7 CLAUDE.md à mettre à jour

- par. 16.2 « Fidèles » : règles du par. 3 ci-dessus.
- par. 6 : dérogation de la recherche en mémoire et sa limite.
- par. 9.3 : parcours E2E « Fidèles ».

## 5. Laissé au développeur

Noms exacts des composants, découpage des fichiers sous 250 lignes, styles (cva), libellés
d'aide secondaires.
