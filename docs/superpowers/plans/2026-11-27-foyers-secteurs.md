# Secteurs, foyers et matricules : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** organiser les fidèles par foyers (secteur, parrain diacre, membres classés par rôle) avec un matricule calculé `1/3MB-I`, un écran Secteurs, une page par foyer et une liste globale filtrable.

**Architecture :** mêmes couches que le module Fidèles actuel. Règles pures dans `shared/domain/members` (+ `toRoman` dans `shared/utils`), trois tables (`sectors`, `households`, `members` modifiée, migration `0009`), repositories + services + IPC dans main, tout le renderer dans `features/members`. Le matricule n'est jamais stocké.

**Tech Stack :** Electron, better-sqlite3 + Drizzle 0.45, zod, React, TanStack Query, react-hook-form, shadcn/ui (Radix), Vitest, Playwright.

**Spec :** `docs/superpowers/specs/2026-11-27-foyers-secteurs-design.md` (à lire avant chaque tâche ; les numéros « spec 7.2 » y renvoient).

## Global Constraints

- Aucun import entre `members` et `accounting` (features, domain, main), sauf `toRoman` depuis `@shared/utils/roman`.
- Données de test **toujours fictives** (repo public).
- Textes UI en français, **sans tiret long ni demi-tiret** ; dates `fr-FR`.
- Matricule : `${foyer}/${rang}${communiant ? 'M' : ''}${baptisé ? 'B' : ''}-${toRoman(secteur)}`, jamais stocké, lecture seule.
- Rangs : `head` et `father` = 1, `mother` = 2, `child` = `last_child_rank + 1` (jamais réutilisé). Les rangs ne bougent jamais seuls.
- Statuts : diacre ⇒ communiant ⇒ baptisé, normalisés par `applyStatusRules` (UI et service), CHECK SQL en dernier rempart.
- Numéros de secteur et de foyer : `max + 1` sur **toutes** les lignes, jamais réattribués, jamais modifiés.
- Le secteur d'un fidèle est celui de son foyer.
- Nom de secteur : chaque mot avec une majuscule initiale (`ambohitsara avaratra` → `Ambohitsara Avaratra`).
- Conservé : nom MAJUSCULES, prénom « Rakoto Tiana », nom + prénom uniques parmi les actifs (`CONFLICT` `name-taken`), téléphone malgache, date de naissance obligatoire 1900 à aujourd'hui, suppression douce confirmée.
- Horloge injectée, jamais `new Date()` dans un service. Codes `ErrorCode` existants seulement.
- Pas de nouvelle dépendance npm (le composant shadcn `select` s'appuie sur `radix-ui`, déjà installé).
- Une migration commitée (`0000` à `0008`) n'est **jamais** modifiée.
- Mémoire du porteur : la **suite complète** (`npm run lint && npm run typecheck && npm test`) une seule fois juste avant chaque commit ; pendant la tâche, seulement les tests ciblés. Pas de build de packaging.
- Fichiers de moins de ~250 lignes ; composants présentationnels sans fetch.

## Review Focus

1. Déplacer un membre dans son propre foyer, ou un Père vers un foyer qui a déjà un rang 1 : refus clair (`BUSINESS_RULE` / `CONFLICT`), aucune écriture partielle. Test : Tâche 4.
2. Échanger le premier enfant vers le haut ou le dernier vers le bas : rien ne change, pas d'erreur SQL d'index unique ; l'UI n'affiche pas la flèche. Test : Tâche 4 et Tâche 11.
3. Supprimer le dernier membre d'un foyer dont il était le parrain : le foyer garde son numéro, passe « à désigner », et devient supprimable. Test : Tâche 4 (suppression du foyer vide : Tâche 5).
4. Recherche `1/3` avec des foyers 1, 13 et 21 : seuls les membres du foyer 1 de rang 3. Test : Tâche 6.
5. Âge la veille, le jour et le lendemain de l'anniversaire (41, 42, 42 ans) ; né un 29 février : un 28 février non bissextile, encore l'âge de l'année d'avant, un an de plus le 1er mars. Test : Tâche 1.

---

### Task 1 : règles pures (rôles, statuts, matricule, âge, secteurs)

**Files :**
- Create : `src/shared/utils/roman.ts`, `src/shared/utils/roman.test.ts`
- Modify : `src/shared/domain/accounting/accounting.codes.ts` (supprime `ROMAN`/`toRoman`, importe et ré-exporte `toRoman` depuis `@shared/utils/roman` pour ne toucher aucun appelant), `accounting.codes.test.ts` (tests de `toRoman` déplacés dans `roman.test.ts`)
- Create : `src/shared/domain/members/households.rules.ts`, `households.rules.test.ts`, `sectors.rules.ts`, `sectors.rules.test.ts`, `src/shared/domain/members/__golden__/matricule.json`
- Modify : `src/shared/domain/members/members.rules.ts`, `members.rules.test.ts` (`communicantError` retiré, remplacé par `applyStatusRules`)

**Interfaces :**
- Produces :
  - `toRoman(n: number): string` (`@shared/utils/roman`, RangeError hors 1..3999, comportement inchangé)
  - `type MemberRole = 'head' | 'father' | 'mother' | 'child'` ; `MEMBER_ROLES` ; `ROLE_LABELS: Record<MemberRole, string>` = `{ head: 'Chef de foyer', father: 'Père', mother: 'Mère', child: 'Enfant' }`
  - `type Sex = 'M' | 'F'` ; `SEX_LABELS = { M: 'Masculin', F: 'Féminin' }`
  - `rankForRole(role: MemberRole, lastChildRank: number): number`
  - `roleError(role: MemberRole, sex: Sex, takenRanks: ReadonlySet<number>): string | null` : messages exacts `'Ce foyer a déjà un rang 1 (Père ou Chef de foyer).'`, `'Ce foyer a déjà une mère.'`, `'Le père est de sexe masculin.'`, `'La mère est de sexe féminin.'`
  - `interface Statuses { baptized: boolean; communicant: boolean; deacon: boolean }` ; `applyStatusRules(s: Statuses): Statuses`
  - `matricule(p: { householdNumber: number; rank: number; baptized: boolean; communicant: boolean; sectorNumber: number }): string`
  - `ageOn(birthDate: string, today: string): number` ; `formatAge(age: number): string` (`'1 an'`, `'42 ans'`, `'0 an'`)
  - `normalizeSectorName(input: string): string` (réutilise `normalizeFirstName`) ; `nextNumber(max: number | null): number` (`null` → 1)

- [ ] **Step 1 : tests en échec**
  - `roman.test.ts` : les cas déplacés (`[1, 4, 9, 14, 40, 2026]` → `['I','IV','IX','XIV','XL','MMXXVI']`, RangeError pour 0 et 4000).
  - `__golden__/matricule.json` : les six exemples du porteur, par ex. `{ "householdNumber": 1, "rank": 1, "baptized": true, "communicant": true, "sectorNumber": 1, "expected": "1/1MB-I" }`, puis `1/2B-I`, `1/3MB-I`, `1/4-I`, `2/1MB-II`, `15/4B-III` ; test `it('calcule les matricules du porteur')` qui les parcourt.
  - `applyStatusRules` : `{deacon:true}` seul → les trois vrais ; `{communicant:true}` → baptisé vrai ; `{baptized:true, communicant:false, deacon:false}` inchangé.
  - `rankForRole('child', 5)` → 6 ; `head`/`father` → 1 ; `mother` → 2.
  - `roleError('father', 'F', new Set())` → message du père ; `roleError('head', 'F', new Set([1]))` → rang 1 pris ; `roleError('child', 'F', new Set([1, 2]))` → `null`.
  - `ageOn` : né `1984-11-28` → 41 le `2026-11-27`, 42 le `2026-11-28` et le `2026-11-29` ; né `2008-02-29` → 17 le `2026-02-28`, 18 le `2026-03-01`.
  - `normalizeSectorName('  aMBODImanga ')` → `'Ambodimanga'` ; `'ambohitsara   avaratra'` → `'Ambohitsara Avaratra'`.
- [ ] **Step 2 :** `npm test -- src/shared` : FAIL (fonctions absentes).
- [ ] **Step 3 :** implémenter. `ageOn` compare (mois, jour) à ceux du jour sans objet `Date` (chaînes `AAAA-MM-JJ`) ; le 29 février compte comme 1er mars.
- [ ] **Step 4 :** `npm test -- src/shared` : PASS (comptabilité comprise, `toRoman` ré-exporté).
- [ ] **Step 5 :** suite complète, puis commit `feat(members): pure rules for roles, statuses, matricule and age`.

### Task 2 : schéma et migration `0009`

**Files :**
- Modify : `src/main/db/schema.ts`
- Create : `drizzle/0009_households.sql` (généré, puis reprise retouchée à la main), `drizzle/meta/0009_snapshot.json`, `drizzle/meta/_journal.json` (généré)
- Modify : `tests/integration/members.schema.test.ts`
- Create : `tests/regression/2026-11-27-households-migration.test.ts` (migration depuis `0008` avec fidèles)

**Interfaces :**
- Produces (Drizzle) : `sectors` (`id`, `number`, `name`, `createdAt`, `updatedAt`), `households` (`id`, `number`, `sectorId`, `sponsorId`, `lastChildRank`, `createdAt`, `updatedAt`, `deletedAt`), `members` + `householdId`, `role`, `rank`, `sex`, `deacon` ; sans `sector` ni `registrationNumber`. Index et CHECK : spec 5.1 à 5.3, noms `sectors_number_unique_idx`, `sectors_name_unique_idx` (`name COLLATE NOCASE`), `households_number_unique_idx`, `households_sector_idx`, `households_sponsor_idx`, `members_rank_unique_idx` (`household_id`, `rank`, `WHERE deleted_at IS NULL`), `members_household_idx` n'est pas utile (couvert par `members_rank_unique_idx`).
- Cycle de clés : `households.sponsorId` → `members.id` s'écrit `.references((): AnySQLiteColumn => members.id)`.

- [ ] **Step 1 : tests en échec** dans `members.schema.test.ts` (base de `createTestDb()`, SQL brut) : un deuxième membre actif au même rang du même foyer est refusé, accepté si le premier a `deleted_at` ; CHECK refusés : `deacon = 1, communicant = 0` ; `role = 'father', sex = 'F'` ; `role = 'mother', rank = 3` ; `role = 'child', rank = 2` ; deux secteurs `Ambodimanga` / `AMBODIMANGA` refusés.
  Test de régression : `migrationsUpTo('0008_accounting_entries_item')`, insérer deux fidèles, puis appliquer toutes les migrations : succès, `members` vide, tables `sectors` et `households` présentes, `PRAGMA foreign_key_check` vide.
- [ ] **Step 2 :** lancer ces tests : FAIL.
- [ ] **Step 3 :** modifier `schema.ts`, puis `npm run db:generate -- --name households`. Si drizzle-kit pose une question de renommage (TTY requis), **s'arrêter et demander au porteur** de le lancer dans un terminal en répondant « create column » à chaque question. Vérifier qu'aucun `npm run dev` n'a encore appliqué `0009`.
- [ ] **Step 4 :** dans `0009_households.sql`, remplacer l'`INSERT INTO __new_members (...) SELECT ... FROM members` généré par un commentaire SQL expliquant pourquoi les fidèles ne sont pas repris (spec 5.4). Rien d'autre à la main.
- [ ] **Step 5 :** tests de la tâche + `tests/regression/migrations.test.ts` : PASS.
- [ ] **Step 6 :** la suite échoue encore sur l'ancien service des fidèles (colonnes retirées) : c'est attendu et corrigé en Tâche 4 ; **ne pas commiter avant**. Les Tâches 2 à 4 forment un seul commit `feat(members): sectors, households and household-based members` (suite complète verte).

### Task 3 : secteurs (repository, service)

**Files :**
- Create : `src/main/repositories/sectors.repository.ts`, `src/main/services/sectors.service.ts`, `tests/integration/sectors.service.test.ts`
- Create : `src/shared/domain/members/sectors.types.ts`

**Interfaces :**
- Produces :
  - `interface SectorDTO { id: number; number: number; name: string; numeral: string; householdCount: number; memberCount: number }`
  - zod : `createSectorInputSchema = { name: string trim 1..80 }`, `renameSectorInputSchema = { id, name }`
  - `createSectorsService({ db, sectors, clock, logger })` → `{ list(): SectorDTO[]; create(i): SectorDTO; rename(i): SectorDTO }` ; trié par `number`.
  - Erreurs : nom pris → `CONFLICT` `'Le secteur Ambodimanga existe déjà (n° II).'` ; id inconnu → `NOT_FOUND`.

- [ ] **Step 1 : tests** : `it('numérote I, II, III dans l’ordre de création')` (`numeral` = `'I'`, `'II'`, `'III'`) ; `it('garde le numéro quand on renomme')` ; `it('met le nom en forme')` (`'ambohitsara avaratra'` → `'Ambohitsara Avaratra'`) ; `it('refuse un nom déjà pris, sans tenir compte de la casse')`. Le test des compteurs (`householdCount`, `memberCount`) est écrit en Tâche 5.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter (`number` = `nextNumber(max(number))` dans la transaction). **Step 4 :** PASS.

### Task 4 : fidèles rattachés à un foyer (service réécrit)

**Files :**
- Modify : `src/shared/domain/members/members.types.ts`, `src/main/repositories/members.repository.ts`, `src/main/services/members.service.ts`, `tests/factories/members.factory.ts`, `tests/integration/members.service.test.ts`, `tests/factories/members.demo-seed.ts` (adaptation minimale, refaite en Tâche 8)
- Create : `src/main/repositories/households.repository.ts` (`insert`, `findById`, `takenRanks`, `bumpLastChildRank`, `clearSponsor(memberId)`, `sponsoredNumbers(memberId)` ; le reste en Tâche 5), `src/shared/domain/members/households.types.ts` (`SponsorDTO` seulement ici), `tests/helpers/members-context.ts`

**Interfaces :**
- Produces :
  - `MemberDTO` : retire `sector`, `registrationNumber` ; ajoute `householdId`, `householdNumber`, `role: MemberRole`, `rank`, `sex: Sex`, `deacon`, `sector: { id; number; name; numeral }`, `sponsor: SponsorDTO | null` (parrain du foyer), `matricule: string`. L'âge n'est **pas** dans le DTO (calculé à l'affichage avec la date du jour du renderer).
  - zod `memberFields` : retire `sector`, `registrationNumber` ; ajoute `sex: z.enum(['M','F'])`, `deacon: boolean default false`. `createMemberInputSchema` = `{ householdId, role, ...memberFields }` ; `updateMemberInputSchema` = `{ id, role, ...memberFields }` ; `moveMemberInputSchema = { id, householdId, role }` ; `swapChildRankInputSchema = { id, direction: z.enum(['up','down']) }`.
  - `interface SponsorDTO { id: number; lastName: string; firstName: string; matricule: string }` (`households.types.ts`)
  - Service `createMembersService({ db, members, households, clock, logger })` : `create`, `update`, `delete`, `move`, `swapChildRank`, `sponsoredHouseholds(id): number[]` (n° des foyers), `list` (Tâche 6), `searchIds(query: string): number[]` et `invalidate(): void` (pour la Tâche 5).
  - `tests/helpers/members-context.ts` : `setupMembers()` → `{ handle, clock, membersService, sector(name?), household(opts?: { sectorId?; sponsorId? }), member(householdId, input?) }`, entrées passées par les schémas zod comme le fait l'IPC ; `sector()` et `household()` écrivent par les repositories tant que leurs services n'existent pas, puis par les services (Tâches 3 et 5).
  - `MemberConflictDetails` : `{ reason: 'name-taken'; existing }` | `{ reason: 'rank-taken'; existing }` (l'ancien `registration-number-taken` disparaît).
  - Factories : `makeMemberInput({ householdId, role, sex, ... })`, `makeMemberDTO` mis à jour.

- [ ] **Step 1 : tests** (via `setupMembers()`) :
  - `it('crée un foyer d’une personne')` : Chef de foyer F → `1/1-I`.
  - `it('classe père, mère et enfants')` : père communiant `1/1MB-I`, mère baptisée `1/2B-I`, enfants `1/3MB-I`, `1/4-I`.
  - `it('crée un foyer sans père')` : mère `2/2B-II`, enfant `2/3-II`.
  - `it('ne réutilise jamais le rang d’un enfant')` : enfants 3, 4, 5 ; supprimer 5 ; nouvel enfant → 6 ; les autres inchangés.
  - `it('déplace un enfant sans changer les rangs du foyer d’origine')` : enfant 4 du foyer 1 → foyer 2, y prend `last_child_rank + 1` ; le prochain enfant du foyer 1 reste à 6.
  - `it('refuse un deuxième rang 1')` (`CONFLICT` `rank-taken`) ; `it('refuse un déplacement vers le même foyer')` (`BUSINESS_RULE`).
  - `it('échange deux enfants voisins')` : rangs 3 et 4 permutés ; premier vers le haut et dernier vers le bas : sans effet, sans erreur.
  - `it('change de rang quand le rôle change')` : enfant → Père (rang 1 libre) ; Chef de foyer reste Chef de foyer quand un membre s'ajoute.
  - `it('applique les statuts')` : entrée `{ deacon: true, baptized: false, communicant: false }` → enregistrée avec les trois vrais.
  - `it('retire le parrainage quand le diacre perd son statut')` et `it('… quand il est supprimé')` : foyers parrainés → `sponsor: null` ; `sponsoredHouseholds` avant → `[3, 7]`.
  - `it('supprime le dernier membre d’un foyer qu’il parrainait')` (Review Focus 3).
  - Conservés et adaptés : nom + prénom uniques, téléphone, date de naissance.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter. `swapChildRank` dans une transaction : enfant A → rang `-A.rank`, B → rang de A, A → rang de B (l'index unique est vérifié par instruction). `create` incrémente `last_child_rank` du foyer pour un enfant. Le matricule est calculé dans le repository à la lecture (jointure foyer + secteur), par `matricule()`.
- [ ] **Step 4 :** tests des Tâches 2 à 4 : PASS.
- [ ] **Step 5 :** suite complète verte. `query-plans.test.ts` et la démo : adaptation minimale pour compiler et passer (la démo crée un secteur et un foyer par fidèle en attendant la Tâche 8 ; la désactiver n'est **pas** permis). Commit groupé des Tâches 2 à 4.

### Task 5 : foyers (service)

**Files :**
- Create : `src/main/services/households.service.ts`, `tests/integration/households.service.test.ts`
- Modify : `src/main/repositories/households.repository.ts`, `src/shared/domain/members/households.types.ts`, `tests/helpers/members-context.ts` (`household()` passe par le service), `tests/integration/sectors.service.test.ts` (compteurs)

**Interfaces :**
- Consumes : Task 1 (`matricule`, `toRoman`), Task 3 (secteurs), Task 4 (`MemberDTO`, `SponsorDTO`, `searchIds`, `invalidate`).
- Produces :
  - `interface HouseholdSummaryDTO { id: number; number: number; sector: { id: number; number: number; name: string; numeral: string }; sponsor: SponsorDTO | null; memberCount: number; mainLastName: string | null }`
  - `interface HouseholdDTO extends HouseholdSummaryDTO { members: MemberDTO[]; takenRanks: number[]; lastChildRank: number }`, `members: MemberDTO[]` trié par rang.
  - zod : `createHouseholdInputSchema = { sectorId, sponsorId: id | null }`, `updateHouseholdInputSchema = { id, sectorId, sponsorId }`, `listHouseholdsInputSchema = { search: string max 100 default '', sectorId?: id, sponsorMissing: boolean default false, page, pageSize default 50 }`, `sponsorCandidatesInputSchema = { search: string max 100 default '' }`
  - `createHouseholdsService({ db, households, members, sectors, clock, logger, memberSearch, onChange })` → `{ list, get(id), create, update, delete(id), sponsorCandidates(search) }` ; `memberSearch` = `membersService.searchIds`, `onChange` = `membersService.invalidate` (changement de secteur ou de parrain). Dans `container.ts`, le service des fidèles est créé d'abord.
  - Erreurs : parrain non diacre ou supprimé → `BUSINESS_RULE` `'Le parrain doit être un diacre.'` ; secteur inconnu → `NOT_FOUND` ; suppression d'un foyer avec membres → `BUSINESS_RULE` `'Retirez d’abord les membres de ce foyer.'`.
  - `list` : recherche par n° exact si la saisie est un nombre, sinon par nom via l'index de recherche des fidèles (ids → foyers) ; trié par `number`.

- [ ] **Step 1 : tests** : numéros 1, 2, 3 ; suppression du foyer 3 puis création → 4 ; foyer sans parrain → `sponsor: null` ; parrain non diacre refusé ; `sponsorCandidates` ne renvoie que les diacres actifs ; `update` du secteur change le `matricule` de tous les membres renvoyés par `get` ; suppression refusée avec membres, acceptée vide ; filtres `sectorId` et `sponsorMissing` ; `mainLastName` = nom du membre de plus petit rang ; compteurs de `sectors.list` (foyers et fidèles actifs).
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter. **Step 4 :** PASS, suite complète, commit `feat(members): households service`.

### Task 6 : liste globale (index en mémoire, filtres, tri, matricule)

**Files :**
- Modify : `src/shared/domain/members/members.search.ts`, `members.search.test.ts`, `__golden__/search.json`
- Create : `src/shared/domain/members/members.list.ts`, `members.list.test.ts`
- Modify : `members.types.ts` (`listMembersInputSchema`), `members.repository.ts` (`searchEntries`), `members.service.ts` (`list`)

**Interfaces :**
- Produces :
  - `SearchEntry` : `{ id; lastName; firstName; matricule; householdId; householdNumber; rank; sectorId; sex; baptized; communicant; deacon; birthDate }`
  - `listMembersInputSchema` : `{ search, page, pageSize, sectorId?: id, householdNumber?: int ≥ 1, sex?: 'M'|'F', baptized?: boolean, communicant?: boolean, deacon?: boolean, sort: z.enum(['name','matricule','birthDate','sector','household']).default('name'), order: z.enum(['asc','desc']).default('asc') }`
  - `filterAndSort(entries: readonly IndexedEntry[], input: ListMembersParsed, matchedIds: number[] | null): number[]` (pur) ; `searchMembers` inchangé pour les noms.
  - Tri `birthDate` asc = plus âgé d'abord ; Âge trie par `birthDate` inversé (même clé côté UI).
- Recherche matricule (Review Focus 4) : un mot tapé contenant `/` est un matricule partiel ; il correspond si le matricule normalisé (minuscules, sans espaces) **commence par** la saisie normalisée. Un mot sans `/` garde l'ancienne règle (identique, début, contenu sur le matricule compacté).

- [ ] **Step 1 : tests** : golden `search.json` complété : `"1/3"` avec foyers 1, 13, 21 → seulement `1/3…` ; `"12/"` → membres du foyer 12 ; filtres combinés (secteur + diacre) ; tri `matricule` = (foyer, rang) numérique (`2/1` avant `10/1`) ; `order: 'desc'`. Service : `list({ householdNumber: 4 })` ne renvoie que le foyer 4 ; temps `filterAndSort` sur 10 000 entrées < 50 ms (même mesure que le test de recherche existant).
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter (sans recherche ni filtre ni tri autre que `name` : chemin SQL actuel `listPage` conservé). **Step 4 :** PASS. **Step 5 :** suite complète, commit `feat(members): global list filters, sort and matricule search`.

### Task 7 : IPC, câblage, plans de requêtes

**Files :**
- Modify : `src/shared/ipc/channels.ts`, `src/shared/ipc/contract.ts`, `src/main/ipc/members.ipc.ts`, `src/main/container.ts`, `tests/integration/query-plans.test.ts`
- Create : `src/main/ipc/households.ipc.ts`, `src/main/ipc/sectors.ipc.ts`, et leur appel dans `src/main/ipc/register.ts`

**Interfaces :**
- Produces : canaux de la spec 7.3 : `sectors.list` (`z.undefined()`), `sectors.create`, `sectors.rename`, `households.list`, `households.get` (`{ id }`), `households.create`, `households.update`, `households.delete` (`{ id }` → `null`), `households.sponsorCandidates` → `SponsorDTO[]`, `members.list`, `members.create`, `members.update`, `members.delete`, `members.move`, `members.swapChildRank` → `null`, `members.sponsoredHouseholds` (`{ id }`) → `number[]`.

- [ ] **Step 1 :** `query-plans.test.ts` : `TABLES` += `sectors|households` ; nouveau parcours `it('fidèles, foyers, secteurs')` : créer secteurs, foyers, membres, `get`, `list` avec filtres, `move`, `swapChildRank`, retrait du statut diacre, `sectors.list`. Lancer : FAIL tant que les requêtes manquent ou si un index manque.
- [ ] **Step 2 :** câbler ; ajouter un index seulement si le test le réclame (nouvelle migration `0010` dans ce cas, `0009` n'étant plus modifiable une fois commitée).
- [ ] **Step 3 :** PASS, suite complète, commit `feat(members): ipc for sectors, households and members`.

### Task 8 : données de démonstration

**Files :**
- Modify : `tests/factories/members.demo-seed.ts`, `scripts/seed-members.task.ts`, `tests/integration/members.demo-seed.test.ts`

**Interfaces :**
- Produces : `seedDemoMembers(services, opts?)` : 8 secteurs (noms fictifs, dont un composé), environ 2 500 foyers, 10 000 fidèles (noms uniques, dates de naissance distinctes conservées), une cinquantaine de diacres, environ 10 % de foyers « à désigner », types de foyers mélangés (personne seule, couple, parent seul, famille de 2 à 8 enfants). Déterministe.
- `seed-members.task.ts` vide `members`, `households`, `sectors` (dans cet ordre de dépendances : d'abord `UPDATE households SET sponsor_id = NULL`), jamais la comptabilité.

- [ ] **Step 1 :** test : comptes attendus, matricules tous distincts, chaque foyer parrainé a un parrain diacre, comptabilité intacte. **Step 2 :** FAIL. **Step 3 :** implémenter. **Step 4 :** PASS, suite complète, commit `test(members): demo households and sectors`.

### Task 9 : renderer, menu, routes, écran Secteurs

**Files :**
- Modify : `src/renderer/src/app/layout/nav-items.ts`, `src/renderer/src/app/router.tsx`
- Create : `src/renderer/src/components/ui/select.tsx` (`npx shadcn add select -y`, vérifier que `package.json` ne change pas ; retirer les `transition-all`)
- Modify : `src/renderer/src/features/members/api.ts`, `queries.ts` (clés `sectors`, `households`, `members` ; toute mutation invalide les trois)
- Create : `features/members/pages/SectorsPage.tsx`, `components/SectorsTable.tsx`, `components/SectorFormDialog.tsx`, `components/SectorsTable.test.tsx`

**Interfaces :**
- Produces : routes `/secteurs`, `/foyers`, `/foyers/:id`, `/fideles` (handles avec `title` ; `fillHeight: true` pour `/fideles` et `/foyers`) ; `MAIN_NAV` section « Fidèles » : `Foyers` (`/foyers`, icône `UsersRound`), `Liste des fidèles` (`/fideles`, `Users`), `Secteurs` (`/secteurs`, `MapPin`).
- `queries.ts` : `useSectors()`, `useCreateSector()`, `useRenameSector()`, puis (Tâches 10 à 12) `useHouseholds(filters)`, `useHousehold(id)`, `useSponsorCandidates(search)`, `useCreateHousehold()`, `useUpdateHousehold()`, `useDeleteHousehold()`, `useMembers(input)`, `useCreateMember()`, `useUpdateMember()`, `useDeleteMember()`, `useMoveMember()`, `useSwapChildRank()`, `useSponsoredHouseholds(id | null)`.

- [ ] **Step 1 :** test composant `SectorsTable` : colonnes Numéro / Nom / Foyers / Fidèles, `II` affiché, bouton « Renommer Ambodimanga ». `SectorFormDialog` : aperçu « Sera enregistré : Ambohitsara Avaratra (n° III) ».
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter (états chargement, erreur avec « Réessayer », vide spec 8.2). **Step 4 :** PASS, suite complète, commit `feat(members): sectors screen and navigation`.

### Task 10 : liste des foyers et création

**Files :**
- Create : `features/members/pages/HouseholdsPage.tsx`, `components/HouseholdsTable.tsx`, `components/HouseholdsToolbar.tsx`, `components/HouseholdFormDialog.tsx`, `components/SponsorPicker.tsx` (Popover + Input de recherche + liste, `useSponsorCandidates` passé par la page), tests `HouseholdsTable.test.tsx`, `HouseholdFormDialog.test.tsx`

**Interfaces :**
- `HouseholdFormDialog` props : `{ open; initial: HouseholdDTO | null; sectors: SectorDTO[]; sponsorSearch: (q) => void; sponsorOptions: SponsorDTO[]; memberCount: number; submitting; serverError; onSubmit({ sectorId, sponsorId }); onCancel }` ; en modification, si le secteur change et `memberCount > 0` : « Les matricules des N membres vont changer. »
- Après création : `navigate('/foyers/' + id + '?ajout=1')`.

- [ ] **Step 1 :** tests : « Parrain à désigner » affiché pour `sponsor: null` ; ligne « 1 · RAKOTO · I Ambodimanga » ; sans secteur, le dialogue affiche le lien vers Secteurs et désactive « Créer ». **Step 2 :** FAIL. **Step 3 :** implémenter (filtre secteur, case « Parrain à désigner », recherche debounce 200 ms, pagination existante `MembersPagination`). **Step 4 :** PASS, suite complète, commit `feat(members): households list and creation`.

### Task 11 : page d'un foyer et fiche du fidèle

**Files :**
- Create : `features/members/pages/HouseholdPage.tsx`, `pages/use-household-editor.ts`, `components/HouseholdHeader.tsx`, `components/HouseholdMembersTable.tsx`, `components/MoveMemberDialog.tsx`, `components/StatusFields.tsx`, tests `HouseholdMembersTable.test.tsx`
- Modify : `components/MemberFormDialog.tsx` (scinder si > 250 lignes), `forms/member-form.schema.ts`, `components/MemberFormDialog.test.tsx`, `components/ConfirmDeleteMemberDialog.tsx` (cite les foyers parrainés), `components/MemberRowActions.tsx`, `members.utils.ts`

**Interfaces :**
- `MemberFormDialog` props ajoutées : `household: HouseholdDTO`, `sponsoredHouseholds: number[]`, `onSubmitAndNext?: (values) => void` (ajout seulement) ; valeurs du formulaire : `role`, `sex`, `deacon` ajoutés ; `sector` et `registrationNumber` retirés.
- `StatusFields` : cocher Diacre coche et verrouille Communiant et Baptisé ; cocher Communiant coche et verrouille Baptisé ; décocher ne décoche rien (même `applyStatusRules`).
- Aperçu du matricule recalculé à chaque changement de rôle ou de statut ; options de rôle grisées avec la raison (« Père : déjà RAKOTO Jean »), via `roleError` et `household.takenRanks`.

- [ ] **Step 1 :** tests composants : cocher Diacre → les deux autres cochés et `disabled` ; décocher Diacre → toujours cochés ; aperçu `1/3MB-I` puis `1/3B-I` en décochant Communiant (Diacre décoché) ; Père grisé si rang 1 pris ; changer le rôle d'un membre existant affiche « Son matricule deviendra 1/1MB-I. » ; avertissement « parrain des foyers 3 et 7 » en décochant Diacre ; « Enregistrer et ajouter un autre » présent à l'ajout seulement ; table du foyer : flèche ↑ absente sur le premier enfant, ↓ sur le dernier (Review Focus 2), âge « 42 ans », « À désigner » dans la colonne Parrain.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter (adresse pré-remplie, rôle par défaut, `?ajout=1` ouvre la fiche, foyer introuvable → état `NOT_FOUND` + « Retour aux foyers », « Supprimer le foyer » si vide, confirmation de l'échange de rangs). **Step 4 :** PASS, suite complète, commit `feat(members): household page and member form`.

### Task 12 : liste des fidèles refaite

**Files :**
- Modify : `features/members/pages/MembersPage.tsx`, `components/MembersTable.tsx`, `components/MembersToolbar.tsx`, `components/MembersEmptyState.tsx`, `use-members-list-state.ts` (filtres et tri dans l'URL via `useSearchParams` : `secteur`, `foyer`, `sexe`, `baptise`, `communiant`, `diacre`, `tri`, `ordre`), tests associés
- Create : `components/MembersFilters.tsx`, `components/SortableHeader.tsx`

**Interfaces :** consomme `useMembers(input: ListMembersInput)` ; colonnes de la spec 8.6 ; lien Foyer vers `/foyers/:id` ; badge Diacre (variante cva dans `members.styles.ts`). Clic sur le nom : `MemberFormDialog` avec `useHousehold(member.householdId)` (fiche identique à celle du foyer) ; menu « ⋯ » : Voir le foyer, Supprimer (même confirmation).

- [ ] **Step 1 :** tests : colonnes dans l'ordre de la spec ; « À désigner » ; lien « Foyer 4 » ; clic sur l'en-tête Matricule → `tri=matricule`, second clic → `ordre=desc` ; « Effacer les filtres » remet l'URL à vide ; changer un filtre remet en page 1 ; plus de bouton « Ajouter un fidèle », état vide renvoyant vers Foyers.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter. **Step 4 :** PASS, suite complète, commit `feat(members): global list with filters and sorting`.

### Task 13 : E2E et documentation

**Files :**
- Modify : `tests/e2e/members.spec.ts` (réécrit, scénario de la spec 9), `tests/e2e/page-margins.spec.ts` si `/secteurs` doit y figurer, `CLAUDE.md` (§16.2 réécrite, §6 dérogation étendue, §9.3 parcours Fidèles)

- [ ] **Step 1 :** écrire l'E2E (sélecteurs par rôle et label) ; `npm run build` puis `npx playwright test tests/e2e/members.spec.ts` : PASS ; puis `npm run test:e2e:smoke` : PASS.
- [ ] **Step 2 :** mettre à jour `CLAUDE.md`.
- [ ] **Step 3 :** suite complète, commit `test(members): e2e for households and sectors` + `docs: households and sectors rules`.
