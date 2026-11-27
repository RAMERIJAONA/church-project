/**
 * Schéma Drizzle : source de vérité des tables.
 * Toute modification → `npm run db:generate` → nouvelle migration dans drizzle/ (jamais éditer
 * une migration publiée).
 *
 * Conventions (CLAUDE.md par. 7) :
 * - dates : TEXT ISO 8601 en UTC (`2026-11-24T10:00:00.000Z`), produites par l'horloge injectée
 * - montants : INTEGER dans la plus petite unité
 */
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn
} from 'drizzle-orm/sqlite-core'

/** Préférences de l'application (thème, accent, densité…). Une ligne par clé, valeur JSON. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull()
})

/*
 * Comptabilité : arborescence sur 4 niveaux (F1 > F1-I > F1-I-1 > F1-I-1 A)).
 * Les numéros ne sont PAS stockés : ils se déduisent de `prefix` (niveau 1) et de l'ordre
 * `position` des éléments non supprimés (shared/domain/accounting).
 * Suppression douce (`deleted_at`) : rien n'est effacé physiquement.
 * Migration 0002 : reprise des anciennes tables accounting_sections / lines / amounts.
 */

/** Élément de l'arbre. `parent_id` NULL = niveau 1 (avec une lettre), sinon pas de lettre. */
export const accountingItems = sqliteTable(
  'accounting_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    parentId: integer('parent_id').references((): AnySQLiteColumn => accountingItems.id),
    /** Niveau 1 : lettre(s) de l'alphabet malgache (« A », « B », « D »…) ; NULL ailleurs */
    prefix: text('prefix'),
    /**
     * Comptabilité : `expense` (sorties, A1, B1…) ou `income` (entrées, A2, B2…). Stockée sur
     * chaque élément (les enfants héritent de leur parent) pour filtrer sans remonter l'arbre.
     * CHECK écrit à la main dans la migration 0004 (contrainte de colonne : pas de recréation
     * de la table, référencée par les saisies et par elle-même).
     */
    ledger: text('ledger', { enum: ['expense', 'income'] })
      .notNull()
      .default('expense'),
    /** Ordre parmi les frères (croissant, avec des trous possibles) */
    position: integer('position').notNull(),
    description: text('description').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at')
  },
  (t) => [
    index('accounting_items_parent_position_idx').on(t.parentId, t.position),
    index('accounting_items_ledger_idx').on(t.ledger),
    /**
     * Une lettre par rubrique principale active et par comptabilité (A1, B1… ; A2, B2…, règle
     * du porteur du 2026-11-25). Migration 0005 : lettres existantes décalées avant création.
     */
    uniqueIndex('accounting_items_root_letter_idx')
      .on(t.ledger, t.prefix)
      .where(sql`${t.parentId} IS NULL AND ${t.deletedAt} IS NULL`),
    check(
      'accounting_items_prefix_check',
      sql`(${t.parentId} IS NULL AND ${t.prefix} IS NOT NULL AND ${t.prefix} NOT GLOB '*[^ABD-PR-TVYZ]*' AND length(${t.prefix}) BETWEEN 1 AND 3) OR (${t.parentId} IS NOT NULL AND ${t.prefix} IS NULL)`
    )
  ]
)

/**
 * Saisie d'un montant (Ariary, entier ≥ 0) pour un élément, une année et un type
 * (estimation / réalisation). Le montant d'une case est la somme de ses saisies actives.
 * `label` NULL = total direct. `operated_on` : date d'opération (« AAAA-MM-JJ ») d'une
 * réalisation, dans l'année de la case ; NULL pour une estimation (annuelle).
 */
export const accountingEntries = sqliteTable(
  'accounting_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    itemId: integer('item_id')
      .notNull()
      .references(() => accountingItems.id),
    year: integer('year').notNull(),
    type: text('type', { enum: ['estimate', 'actual'] }).notNull(),
    amount: integer('amount').notNull(),
    label: text('label'),
    operatedOn: text('operated_on'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at')
  },
  (t) => [
    index('accounting_entries_year_item_idx').on(t.year, t.itemId),
    index('accounting_entries_operated_on_idx').on(t.operatedOn),
    /**
     * Saisies d'une rubrique (migration 0008, 2026-11-27) : sert la clé étrangère `item_id`
     * (SQLite la vérifie à chaque écriture d'une rubrique) et la liste des rubriques ayant des
     * saisies, lue dans l'index seul. Index complet (pas partiel) : une clé étrangère ne peut
     * pas s'appuyer sur un index partiel.
     */
    index('accounting_entries_item_idx').on(t.itemId, t.deletedAt),
    check('accounting_entries_type_check', sql`${t.type} IN ('estimate', 'actual')`),
    check('accounting_entries_amount_check', sql`${t.amount} >= 0`),
    check(
      'accounting_entries_operated_on_check',
      sql`(${t.type} = 'estimate' AND ${t.operatedOn} IS NULL) OR (${t.type} = 'actual' AND ${t.operatedOn} IS NOT NULL AND CAST(substr(${t.operatedOn}, 1, 4) AS INTEGER) = ${t.year})`
    )
  ]
)

/*
 * Secteurs (porteur, 2026-11-27). Numéro romain = `number`, attribué dans l'ordre de création,
 * jamais modifié ni réattribué. Pas de suppression (non demandée).
 */
export const sectors = sqliteTable(
  'sectors',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    number: integer('number').notNull(),
    /** « Ambohitsara Avaratra » (normalizeSectorName) */
    name: text('name').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (t) => [
    uniqueIndex('sectors_number_unique_idx').on(t.number),
    uniqueIndex('sectors_name_unique_idx').on(sql`${t.name} COLLATE NOCASE`)
  ]
)

/*
 * Foyers (porteur, 2026-11-27). `number` unique sur toutes les lignes, supprimées comprises :
 * jamais réattribué. `sponsor_id` NULL = « Parrain à désigner » ; le service vérifie que le
 * parrain est un diacre actif. `last_child_rank` : plus haut rang jamais donné à un enfant.
 */
export const households = sqliteTable(
  'households',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    number: integer('number').notNull(),
    sectorId: integer('sector_id')
      .notNull()
      .references(() => sectors.id),
    sponsorId: integer('sponsor_id').references((): AnySQLiteColumn => members.id),
    lastChildRank: integer('last_child_rank').notNull().default(2),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at')
  },
  (t) => [
    uniqueIndex('households_number_unique_idx').on(t.number),
    index('households_sector_idx').on(t.sectorId),
    index('households_sponsor_idx').on(t.sponsorId),
    check('households_last_child_rank_check', sql`${t.lastChildRank} >= 2`)
  ]
)

/*
 * Fidèles (porteur, 2026-11-27). Indépendant de la comptabilité. Nom et prénom stockés déjà
 * normalisés (shared/domain/members/members.rules.ts). Suppression douce (`deleted_at`).
 * Chaque fidèle appartient à un foyer ; son secteur est celui du foyer ; son matricule est
 * calculé (`matricule()`), jamais stocké (migration 0009).
 */
export const members = sqliteTable(
  'members',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    householdId: integer('household_id')
      .notNull()
      .references((): AnySQLiteColumn => households.id),
    /** head | father | mother | child (households.rules.ts) */
    role: text('role', { enum: ['head', 'father', 'mother', 'child'] }).notNull(),
    /** Rang dans le foyer, selon le rôle : 1, 2, puis 3 et plus pour les enfants */
    rank: integer('rank').notNull(),
    sex: text('sex', { enum: ['M', 'F'] }).notNull(),
    /** MAJUSCULES : « RAKOTO » */
    lastName: text('last_name').notNull(),
    /** « Rakoto Tiana » */
    firstName: text('first_name').notNull(),
    /** « AAAA-MM-JJ », date du calendrier sans fuseau */
    birthDate: text('birth_date').notNull(),
    address: text('address').notNull(),
    /** « +261341234567 » */
    phone: text('phone'),
    baptized: integer('baptized', { mode: 'boolean' }).notNull().default(false),
    communicant: integer('communicant', { mode: 'boolean' }).notNull().default(false),
    deacon: integer('deacon', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at')
  },
  (t) => [
    /**
     * Nom et prénom uniques parmi les fidèles actifs (porteur, 2026-11-27) ; sert aussi au tri de
     * la liste. Remplace `members_name_idx` (migration 0007).
     */
    uniqueIndex('members_name_unique_idx')
      .on(t.lastName, t.firstName)
      .where(sql`${t.deletedAt} IS NULL`),
    /** Un rang par foyer parmi les membres actifs : matricules uniques (migration 0009) */
    uniqueIndex('members_rank_unique_idx')
      .on(t.householdId, t.rank)
      .where(sql`${t.deletedAt} IS NULL`),
    check('members_baptized_check', sql`${t.baptized} IN (0, 1)`),
    check('members_communicant_check', sql`${t.communicant} IN (0, 1)`),
    check('members_deacon_check', sql`${t.deacon} IN (0, 1)`),
    /** Un membre communiant est toujours baptisé (porteur, 2026-11-27) */
    check('members_communicant_baptized_check', sql`${t.communicant} = 0 OR ${t.baptized} = 1`),
    /** Un diacre est toujours communiant (et donc baptisé) */
    check('members_deacon_communicant_check', sql`${t.deacon} = 0 OR ${t.communicant} = 1`),
    check('members_role_check', sql`${t.role} IN ('head', 'father', 'mother', 'child')`),
    check('members_sex_check', sql`${t.sex} IN ('M', 'F')`),
    /** Rang selon le rôle (porteur, 2026-11-27) */
    check(
      'members_rank_check',
      sql`(${t.role} IN ('head', 'father') AND ${t.rank} = 1) OR (${t.role} = 'mother' AND ${t.rank} = 2) OR (${t.role} = 'child' AND ${t.rank} >= 3)`
    ),
    check('members_father_sex_check', sql`${t.role} <> 'father' OR ${t.sex} = 'M'`),
    check('members_mother_sex_check', sql`${t.role} <> 'mother' OR ${t.sex} = 'F'`)
  ]
)
