# Secteurs, foyers et matricules des fidèles : conception

Date : 2026-11-27. Statut : approuvée par le porteur le 2026-11-27.
Fait évoluer `2026-11-27-fideles-design.md` (module Fidèles, §16.2 du CLAUDE.md).

## 1. Intention

L'église organise ses fidèles par **foyers** (une famille, un parent seul et ses enfants, ou une
personne seule), rattachés à un **secteur** et suivis par un **parrain diacre**. Le matricule de
chaque fidèle découle de cette organisation (`1/3MB-I` : foyer 1, rang 3, communiant et baptisé,
secteur I) au lieu d'être saisi à la main. On ne crée donc plus un fidèle isolé : on crée un
foyer, puis on y inscrit ses membres. La liste globale des fidèles reste, pour retrouver
quelqu'un sans ouvrir chaque foyer.

Le module reste **indépendant de la comptabilité** (aucun lien de données, aucun import entre
`members` et `accounting`), sauf le helper pur `toRoman`, déplacé dans `shared/utils` (par. 6.1).

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Écran « Secteurs » : créer, renommer, lister ; numéro romain attribué à la création, stable.
- Écran « Foyers » : liste des foyers ; page d'un foyer avec ses membres ; créer, modifier un
  foyer ; ajouter, modifier, supprimer, déplacer un membre ; réordonner les enfants.
- Matricule calculé, jamais saisi, toujours à jour, unique.
- Statuts baptisé / communiant / diacre cohérents, appliqués par l'UI, le service et la base.
- Âge calculé à l'affichage.
- « Liste des fidèles » globale : recherche (nom, prénom, matricule), filtres (secteur, foyer,
  sexe, baptisé, communiant, diacre), tri des colonnes, accès au foyer.

**Non-objectifs (cette version)**
- Supprimer un secteur (non demandé).
- Impression et export Excel des listes.
- Historique des déplacements d'un fidèle entre foyers.
- Reprise des fidèles déjà en base (par. 5.4 : aucune donnée réelle n'existe).

**Anti-objectifs (échec même si « ça marche »)**
- Deux fidèles actifs avec le même matricule, ou un matricule affiché périmé.
- Le matricule d'un fidèle qui change alors que rien ne le concerne (rangs stables, par. 3.3).
- Un foyer dont le parrain n'est plus diacre.
- Une liste globale lente sur le Core 2 Duo (au-delà de 100 ms par interaction, debounce exclu)
  avec 10 000 fidèles.
- Une donnée réelle de fidèle dans le repo (public).

## 3. Règles métier

### 3.1 Reçues du porteur (demande écrite du 2026-11-27)

- **Secteur** : nom « majuscule suivie de minuscules » (`Ambodimanga`) ; numéro en chiffres
  romains selon l'ordre de création (I, II, III…), stable quand on renomme, jamais réattribué.
- **Foyer** : numéro en chiffres arabes attribué automatiquement, non modifiable ; un secteur
  choisi parmi les secteurs enregistrés ; un parrain diacre ; un ou plusieurs membres. Père, mère
  et enfants facultatifs.
- **Fidèle** : nom, prénom, date de naissance, sexe (Masculin / Féminin), baptisé, communiant,
  diacre, téléphone, adresse, secteur, matricule (calculé). Âge calculé, jamais saisi ni stocké.
- **Statuts** : communiant ⇒ baptisé ; diacre ⇒ baptisé et communiant. Activer un statut active
  ceux qu'il exige ; désactiver communiant ne retire pas le baptême ; désactiver diacre garde
  baptisé et communiant. Contrôlé côté interface **et** côté backend.
- **Matricule** : `[n° du foyer]/[rang][M si communiant][B si baptisé]-[n° romain du secteur]`,
  `M` toujours avant `B`. Exemples : `1/1MB-I`, `1/2B-I`, `1/4-I`, `15/4B-III`. Recalculé si le
  foyer, le rang, un statut ou le secteur change. Lecture seule. Unique.
- **Parrain** : choisi parmi les diacres seulement ; attaché au foyer, pas au membre.
- Conservées du module actuel : nom en MAJUSCULES, prénom « Rakoto Tiana », nom et prénom uniques
  parmi les fidèles actifs (`CONFLICT`, `name-taken`), date de naissance obligatoire (1900 à
  aujourd'hui), téléphone malgache, suppression douce confirmée, recherche tolérante aux fautes.

### 3.2 Décisions du porteur pendant la conception (2026-11-27)

| Sujet | Décision |
|---|---|
| Rang | **selon le rôle** : Père = 1, Mère = 2, Enfants = 3, 4, 5… Une mère seule avec deux enfants : `x/2`, `x/3`, `x/4` (le rang 1 reste vide) |
| Personne seule | rôle **Chef de foyer**, **rang 1** quel que soit le sexe |
| Premier parrain | le parrain peut rester **« à désigner »** : un foyer s'enregistre sans parrain |
| Départ d'un enfant | **les rangs ne bougent pas** : `4/3`, `4/4`, `4/5`, le premier part → `4/4`, `4/5` restent |
| Création d'un foyer | **le foyer d'abord, puis les membres à la chaîne** (« Enregistrer et ajouter un autre ») |

### 3.3 Conséquences proposées au porteur pendant la conception (non contestées)

- Rôles : **Chef de foyer** (1), **Père** (1), **Mère** (2), **Enfant** (3 et plus). Un foyer a
  au plus un rang 1 (Père **ou** Chef de foyer) et au plus une Mère. Père → sexe Masculin,
  Mère → sexe Féminin ; Chef de foyer et Enfant : l'un ou l'autre.
- Rien ne change tout seul quand quelqu'un rejoint un foyer : un Chef de foyer reste Chef de foyer
  tant qu'on ne modifie pas son rôle (l'UI prévient alors que son matricule change).
- **Rang d'enfant jamais réutilisé** dans un foyer : un nouvel enfant prend le rang qui suit le
  plus haut jamais attribué à un enfant de ce foyer (si `4/5` part, le suivant est `4/6`). Le rang
  1 ou 2 se reprend forcément (un nouveau père reprend le 1).
- **Réordonner les enfants** (monter / descendre) : deux enfants voisins échangent leurs rangs ;
  l'UI prévient que deux matricules changent.
- **Le secteur d'un fidèle est celui de son foyer** (pas de secteur propre). Changer le secteur
  d'un foyer change le matricule de tous ses membres (l'UI le dit avant d'enregistrer).
- **Parrain à désigner** affiché dans la fiche du foyer et les deux listes ; filtre « Parrain à
  désigner » dans la liste des foyers.
- **Un diacre qui perd son statut, ou qui est supprimé** : ses foyers repassent « Parrain à
  désigner » dans la même transaction, après un avertissement qui les nomme (« Ce fidèle est le
  parrain des foyers 3 et 7. Ils passeront en Parrain à désigner. »). Rien n'est bloqué.
- Un diacre peut parrainer n'importe quel foyer, le sien compris (aucune règle contraire reçue).
- Date de naissance toujours obligatoire : le « — » de l'âge ne sert pas.
- Fidèles actuellement en base (dev et démo seulement) non repris ; démo regénérée (par. 5.4).
- Matricule calculé, jamais stocké (par. 4, approche retenue).

## 4. Approches considérées

### 4.1 Matricule

| | Approche | Gain | Coût | Choix |
|---|---|---|---|---|
| **A** | **Calculé à l'affichage** (fonction pure) à partir du n° de foyer, du rang, des statuts et du n° de secteur | jamais faux ni périmé ; unique par construction (n° de foyer unique + rang unique dans le foyer) ; même principe que les numéros de la comptabilité (`accounting.codes.ts`) | tri, filtre et recherche sur le matricule faits en mémoire (déjà le cas pour la recherche) | **retenue** (choix technique de l'équipe) |
| B | Stocké dans `members.registration_number`, recalculé par le service à chaque changement | index SQL direct | dénormalisation : un changement de secteur ou de statut oublié = matricule faux en base | écartée |

### 4.2 Création d'un foyer (choix du porteur)

| | Approche | Gain | Coût | Choix |
|---|---|---|---|---|
| A | Un seul formulaire : foyer + N fiches de membres, tout enregistré d'un coup | tout ou rien | long à l'écran pour 7 membres ; une erreur bloque tout | écartée |
| **B** | **Foyer d'abord, puis sa page s'ouvre avec la fiche d'un premier membre ; « Enregistrer et ajouter un autre »** | même geste pour créer et compléter plus tard ; une erreur ne bloque qu'un membre ; réutilise la fiche actuelle | un foyer peut rester vide (« Aucun membre », supprimable) | **retenue par le porteur** |

## 5. Données

### 5.1 Table `sectors` (nouvelle)

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | INTEGER PK autoincrement | |
| `number` | INTEGER NOT NULL | unique ; `max(number) + 1` à la création ; jamais modifié |
| `name` | TEXT NOT NULL | normalisé (`normalizeSectorName`) ; unique, insensible à la casse (`COLLATE NOCASE`) |
| `created_at`, `updated_at` | TEXT NOT NULL | ISO UTC, horloge injectée |

Pas de `deleted_at` : la suppression n'est pas demandée.

### 5.2 Table `households` (nouvelle, « foyers »)

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | INTEGER PK autoincrement | |
| `number` | INTEGER NOT NULL | unique **toutes lignes comprises** (supprimées aussi) : jamais réattribué ; `max(number) + 1` |
| `sector_id` | INTEGER NOT NULL | FK `sectors.id` |
| `sponsor_id` | INTEGER NULL | FK `members.id` ; `NULL` = Parrain à désigner |
| `last_child_rank` | INTEGER NOT NULL DEFAULT 2 | plus haut rang jamais attribué à un enfant de ce foyer (par. 3.3) |
| `created_at`, `updated_at` | TEXT NOT NULL | |
| `deleted_at` | TEXT NULL | suppression douce, seulement sans membre actif |

Index : `sector_id` (filtre), `sponsor_id` (foyers d'un parrain, et clé étrangère).

`sponsor_id` → `members` et `members.household_id` → `households` forment un cycle de clés
étrangères : permis par SQLite (contrôle à l'écriture de chaque ligne). Le service vérifie en plus
que le parrain est un diacre actif (pas exprimable en CHECK).

### 5.3 Table `members` (modifiée)

Colonnes **ajoutées** : `household_id` INTEGER NOT NULL (FK `households.id`), `role` TEXT NOT
NULL (`head` | `father` | `mother` | `child`), `rank` INTEGER NOT NULL, `sex` TEXT NOT NULL
(`M` | `F`), `deacon` INTEGER NOT NULL DEFAULT 0.
Colonnes **retirées** : `sector` (devient celui du foyer), `registration_number` (calculé), et
l'index `members_registration_number_idx`.

Contraintes :
- `members_rank_unique_idx` : unique (`household_id`, `rank`) **parmi les membres actifs** →
  unicité du matricule ; sert aussi à lister un foyer par rang.
- CHECK : `role` et `sex` dans leurs valeurs ; `deacon IN (0, 1)` ; `deacon = 0 OR communicant = 1` ;
  `communicant = 0 OR baptized = 1` (déjà là) ; rang cohérent avec le rôle (`head`/`father` → 1,
  `mother` → 2, `child` → ≥ 3) ; `father` → `M`, `mother` → `F`.
- Conservé : `members_name_unique_idx` (nom et prénom uniques, tri).

### 5.4 Migration `0009`

- Générée par `drizzle-kit generate` (dans un vrai terminal : questions interactives possibles).
  L'ajout de colonnes `NOT NULL` sans défaut et de CHECK de table fait **recréer** `members`
  (`__new_members`).
- **Reprise écrite à la main avant le premier `npm run dev`** : la copie `INSERT INTO
  __new_members SELECT … FROM members` générée est **remplacée par aucune copie** : les fidèles
  existants ne sont pas repris. Justification : aucune version installée à l'église ne contient
  les fidèles (pas de tag de release ; la fixture `v0.1.0` est antérieure à la migration `0006`),
  donc seules des données de dev ou de démo sont perdues, et la sauvegarde automatique avant
  migration (par. 7 du CLAUDE.md) les garde.
- Test de migration : depuis une base au niveau `0008` contenant des fidèles
  (`migrationsUpTo()`), la migration passe, `members` est vide, `PRAGMA foreign_key_check` est
  propre ; la fixture `v0.1.0` passe toujours.
- Les migrations `0006` à `0008` ne sont pas modifiées.

## 6. Règles pures (`shared/`)

### 6.1 `shared/utils/roman.ts`
`toRoman` déplacé depuis `accounting.codes.ts` (qui l'importe désormais ; ses tests suivent),
pour que `members` ne dépende pas d'`accounting`. Seul changement côté comptabilité.

### 6.2 `shared/domain/members/`
- `sectors.rules.ts` : `normalizeSectorName(s)` : espaces en trop retirés, chaque mot avec une
  majuscule initiale et le reste en minuscules (`aMBODImanga` → `Ambodimanga`,
  `ambohitsara avaratra` → `Ambohitsara Avaratra` : porteur, 2026-11-27), même mise en forme que
  `normalizeFirstName` (qu'elle réutilise) ; `nextNumber(existing)`.
- `households.rules.ts` :
  - `rankForRole(role, lastChildRank)` : `head`/`father` → 1, `mother` → 2, `child` →
    `lastChildRank + 1`.
  - `roleError(role, sex, occupiedRanks)` : rang 1 ou 2 déjà occupé, Père non masculin, Mère non
    féminine → message en français.
  - `ROLE_LABELS` : Chef de foyer, Père, Mère, Enfant.
- `members.rules.ts` (ajouts) :
  - `applyStatusRules({ baptized, communicant, deacon })` : diacre ⇒ communiant ⇒ baptisé ;
    utilisée par le formulaire (cases cochées automatiquement) **et** par le service (vérité,
    l'entrée est normalisée, jamais refusée) ; le CHECK SQL reste le dernier rempart.
    `communicantError` disparaît.
  - `matricule({ householdNumber, rank, baptized, communicant, sectorNumber })` → `1/3MB-I`.
    Golden tests `__golden__/matricule.json` (les 6 exemples du porteur au minimum).
  - `ageOn(birthDate, today)` : années révolues, anniversaire compris ; né un 29 février → âge
    pris le 1er mars les années non bissextiles (**choix de l'équipe**). Affiché « 42 ans ».
- `members.search.ts` : l'index porte le matricule calculé ; voir par. 7.2.

## 7. Process main

### 7.1 Repositories et services
- `sectors.repository.ts`, `sectors.service.ts` (`list` avec nombre de foyers et de fidèles,
  `create`, `rename`). Nom déjà pris → `CONFLICT`.
- `households.repository.ts`, `households.service.ts` :
  - `list({ sectorId?, sponsorMissing?, search?, page })` : n°, secteur, parrain, nombre de
    membres, nom du membre de plus petit rang (pour reconnaître le foyer : « Foyer 4 · RAKOTO »,
    **choix de l'équipe**), trié par n° ; recherche par n° de foyer ou nom d'un membre.
  - `get(id)` : foyer + membres actifs triés par rang, avec matricule et âge prêts à afficher.
  - `create({ sectorId, sponsorId })`, `update({ id, sectorId, sponsorId })`, `delete(id)`
    (refusé `BUSINESS_RULE` s'il reste un membre actif).
  - `sponsorCandidates(search)` : diacres actifs (nom, prénom, matricule), pour la liste de choix.
  - Contrôle : parrain = fidèle actif et diacre, sinon `BUSINESS_RULE`.
- `members.service.ts` (étendu) :
  - `create({ householdId, role, … })` : rang par `rankForRole`, `last_child_rank` incrémenté dans
    la même transaction ; `update` (changer de rôle recalcule le rang) ; `delete` ;
    `move({ id, householdId, role })` vers un autre foyer (rang pris dans le foyer cible ; le
    `last_child_rank` du foyer d'origine ne baisse pas) ; `swapChildRank({ id, direction })`
    avec l'enfant voisin (échange via un rang temporaire, l'index unique étant vérifié à chaque
    instruction).
  - Diacre retiré ou fidèle supprimé : `sponsor_id = NULL` sur ses foyers dans la même
    transaction ; `sponsoredHouseholds(id)` sert à l'avertissement de l'UI avant l'enregistrement.
  - Statuts normalisés par `applyStatusRules`.
  - Rang déjà occupé (deux pères, deux mères) → `CONFLICT` avec le membre en place.
- Chaque écriture qui change un matricule (secteur du foyer, rôle, statut, déplacement, échange)
  invalide l'index de recherche, comme aujourd'hui.

### 7.2 Liste globale
- Étend la dérogation du par. 6 du CLAUDE.md : l'index en mémoire du process main porte, par
  fidèle actif, les champs filtrables et triables (n° de foyer, rang, n° et id de secteur, sexe,
  statuts, date de naissance, matricule). Filtres, tri et recherche sont une fonction pure ; la
  base ne renvoie que la page par ids. Environ 300 Ko pour 10 000 fidèles ; temps mesuré dans un
  test comme pour la recherche actuelle.
- Recherche sur le matricule : **la saisie d'un matricule partiel doit cibler le bon foyer**
  (`1/3` trouve `1/3MB-I` mais pas `13/1MB-I` ni `21/3-I` ; `12/` trouve les membres du foyer
  12). L'algorithme exact est laissé au builder, couvert par les golden de recherche.
- Tri (en-tête de colonne cliquable, ascendant / descendant) : Matricule (n° de foyer puis rang),
  Nom (défaut : nom puis prénom), Date de naissance / Âge, Secteur, Foyer.

### 7.3 IPC (`shared/ipc/channels.ts` + `contract.ts`)
`sectors.list`, `sectors.create`, `sectors.rename` ; `households.list`, `households.get`,
`households.create`, `households.update`, `households.delete`, `households.sponsorCandidates` ;
`members.list` (filtres et tri ajoutés), `members.create`, `members.update`, `members.delete`,
`members.move`, `members.swapChildRank`, `members.sponsoredHouseholds`. Les schémas zod des
fidèles perdent `sector` et `registrationNumber`, gagnent `householdId`, `role`, `sex`, `deacon`.

## 8. Interface

Tout reste dans `features/members` (un seul domaine : registre des fidèles ; la règle « une
feature n'importe pas une autre » empêcherait sinon le foyer de réutiliser la fiche du fidèle).

### 8.1 Menu
Section « Fidèles » (comme « Comptabilité ») : **Foyers** (`/foyers`), **Liste des fidèles**
(`/fideles`), **Secteurs** (`/secteurs`). Libellé à raccourcir si la ligne déborde.

### 8.2 Secteurs (`/secteurs`)
Tableau Numéro · Nom · Foyers · Fidèles ; « Ajouter un secteur » (dialogue, un champ Nom avec
aperçu de la mise en forme et du numéro qu'il recevra) ; « Renommer » par ligne. État vide :
« Aucun secteur. Créez d'abord un secteur pour pouvoir créer un foyer. »

### 8.3 Foyers (`/foyers`)
```
Foyers                         [Rechercher…]  [Secteur v] [ ] Parrain à désigner  [+ Nouveau foyer]
N°  Foyer          Secteur          Parrain              Membres
1   RAKOTO         I Ambodimanga    RABE Jean            4
2   RASOA          II Antanety      Parrain à désigner   1
```
« Nouveau foyer » : dialogue Secteur (liste des secteurs, obligatoire ; sans secteur, renvoie
vers l'écran Secteurs) + Parrain (liste de choix des diacres avec recherche, « À désigner » par
défaut) → à l'enregistrement, ouvre `/foyers/:id` avec la fiche d'un premier membre.

### 8.4 Page d'un foyer (`/foyers/:id`)
```
Foyer 1 · Secteur I Ambodimanga · Parrain : RABE Jean            [Modifier le foyer]
Matricule  Rôle    Nom     Prénom  Naissance   Âge  Téléphone      Adresse  Secteur  Diacre  Parrain
1/1MB-I    Père    RAKOTO  Jean    12/03/1975  51   034 12 345 67  Lot II   I        Oui     RABE Jean
1/3-I      Enfant  RAKOTO  Soa     02/05/2015  11                  Lot II   I        Non     RABE Jean   [↑][↓]
[+ Ajouter un membre]
```
- Colonnes demandées par le porteur (par. 8 de sa demande), plus le rôle ; triées par rang.
- Actions par ligne (menu « ⋯ », comme aujourd'hui) : Voir / modifier la fiche, Déplacer vers un
  autre foyer (choix du foyer et du rôle), Supprimer (confirmation). Monter / descendre sur les
  enfants seulement.
- « Modifier le foyer » : secteur et parrain ; avertit si les matricules des membres changent.
- Foyer sans membre : « Aucun membre » + « Ajouter un membre » + « Supprimer le foyer ».
- Bouton « Retour aux foyers ».

### 8.5 Fiche d'un fidèle (dialogue, `MemberFormDialog` étendu)
- En tête, en lecture seule : **Matricule** (aperçu recalculé pendant la saisie avec la même
  fonction pure), Foyer, Secteur, Parrain, Âge.
- Champs : Rôle (options indisponibles grisées avec la raison, ex. « Père : déjà RAKOTO Jean »),
  Nom, Prénom, Sexe (Masculin / Féminin), Date de naissance, Adresse, Téléphone, Baptisé,
  Communiant, Diacre.
- Cocher Diacre coche Communiant et Baptisé et les verrouille tant que Diacre est coché ; cocher
  Communiant coche et verrouille Baptisé ; décocher ne décoche rien d'autre.
- Décocher Diacre sur un parrain : avertissement sous la case (« parrain des foyers 3 et 7 : ils
  passeront en Parrain à désigner »).
- À l'ajout : Adresse pré-remplie avec celle du membre de plus petit rang du foyer (**choix de
  l'équipe**, modifiable) ; Rôle obligatoire, sans valeur par défaut pour le premier membre d'un
  foyer vide, « Enfant » par défaut ensuite (**choix de l'équipe**).
- Foyer introuvable (`/foyers/:id` d'un foyer supprimé) : état d'erreur `NOT_FOUND` avec « Retour
  aux foyers ».
- Boutons à l'ajout : « Enregistrer », « Enregistrer et ajouter un autre ».
- La fiche ouverte depuis la liste globale est la même.

### 8.6 Liste des fidèles (`/fideles`)
- Garde la mise en page actuelle (seul le tableau défile, `fillHeight`), la recherche, la
  pagination par 50.
- Colonnes : Matricule, Nom, Prénom, Date de naissance, Âge, Téléphone, Adresse, Secteur,
  Diacre (badge visible « Diacre »), Parrain diacre (ou « À désigner »), Foyer (lien vers
  `/foyers/:id`).
- Filtres sur une ligne : Secteur, Foyer (n°), Sexe, Baptisé, Communiant, Diacre (chacun :
  Tous / Oui / Non) ; « Effacer les filtres ». Filtres et tri gardés dans l'URL, comme les vues
  de la comptabilité.
- Plus de bouton « Ajouter un fidèle » ici : l'état vide renvoie vers « Foyers ».
- Clic sur le nom : fiche du fidèle ; menu « ⋯ » : Voir le foyer, Supprimer.

### 8.7 Statuts dans les listes
Baptisé et Communiant restent lisibles via le matricule (`M`, `B`) ; Diacre a sa colonne avec un
badge (cva, couleurs des tokens).

## 9. Tests

- Unitaires : `toRoman` (déplacé), `normalizeSectorName`, `rankForRole`, `roleError`,
  `applyStatusRules`, `matricule` (golden), `ageOn` (anniversaire la veille, le jour, le
  lendemain, 29 février), filtres / tri / recherche par matricule (golden).
- Intégration (SQLite en mémoire, vraies migrations) : numéros de secteur et de foyer stables
  (renommage, suppression d'un foyer) ; foyer d'une personne, père + mère + enfants, mère seule ;
  rang d'enfant non réutilisé après suppression et après déplacement ; échange de rangs ; deux
  pères refusés ; parrain non diacre refusé ; diacre retiré / supprimé → foyers sans parrain ;
  statuts normalisés ; CHECK SQL ; matricules uniques ; migration `0009` depuis `0008` avec
  fidèles ; plans de requêtes (`query-plans.test.ts`, nouveaux parcours ajoutés).
- Composants : fiche (statuts cochés automatiquement, rôles indisponibles, aperçu du matricule),
  table d'un foyer, liste globale (colonnes, lien foyer).
- E2E `members.spec.ts` réécrit : créer un secteur → le renommer (numéro inchangé) → créer un
  foyer (parrain à désigner) → ajouter père, mère, deux enfants à la chaîne → matricules
  attendus → cocher Diacre sur le père → parrain du foyer 2 = ce père → liste globale : mêmes
  matricules, filtre par secteur, recherche avec une faute → modifier le baptême d'un enfant →
  matricule mis à jour dans les deux listes → supprimer un enfant → rangs des autres inchangés.
- Seed de démo (`members.demo-seed.ts`) refait : environ 8 secteurs, 2 500 foyers, 10 000
  fidèles fictifs (noms uniques conservés), une cinquantaine de diacres, des foyers sans parrain.
  `seed:members` vide désormais `members`, `households` et `sectors` (toujours sans toucher la
  comptabilité).

## 10. Laissé au builder

Algorithme exact de la recherche par matricule (contrainte du par. 7.2) ; découpage des
composants (moins de 250 lignes chacun) ; textes des messages d'erreur dans le ton existant ;
largeurs des colonnes ; ordre des commits.

## 11. Documentation à mettre à jour
CLAUDE.md : §16.2 (règles ci-dessus, migration `0009`), §6 (dérogation étendue de l'index en
mémoire), §9.3 (parcours E2E Fidèles).
