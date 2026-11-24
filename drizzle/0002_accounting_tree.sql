CREATE TABLE `accounting_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`year` integer NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`label` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`item_id`) REFERENCES `accounting_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "accounting_entries_type_check" CHECK("accounting_entries"."type" IN ('estimate', 'actual')),
	CONSTRAINT "accounting_entries_amount_check" CHECK("accounting_entries"."amount" >= 0)
);
--> statement-breakpoint
CREATE INDEX `accounting_entries_year_item_idx` ON `accounting_entries` (`year`,`item_id`);--> statement-breakpoint
CREATE TABLE `accounting_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`prefix` text,
	`position` integer NOT NULL,
	`description` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`parent_id`) REFERENCES `accounting_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "accounting_items_prefix_check" CHECK(("accounting_items"."parent_id" IS NULL AND "accounting_items"."prefix" IS NOT NULL AND "accounting_items"."prefix" NOT GLOB '*[^ABD-PR-TVYZ]*' AND length("accounting_items"."prefix") BETWEEN 1 AND 3) OR ("accounting_items"."parent_id" IS NOT NULL AND "accounting_items"."prefix" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `accounting_items_parent_position_idx` ON `accounting_items` (`parent_id`,`position`);--> statement-breakpoint
-- Reprise des données 0001 (écrite à la main) : rubrique → niveau 1 (même id),
-- ligne → niveau 2 (id décalé du plus grand id de rubrique : aucune collision),
-- montant → saisie « réalisation » sans libellé (créée à l'ancienne date de mise à jour).
INSERT INTO `accounting_items` (`id`, `parent_id`, `prefix`, `position`, `description`, `created_at`, `updated_at`, `deleted_at`)
  SELECT `id`, NULL, `prefix`, `position`, `description`, `created_at`, `updated_at`, `deleted_at`
  FROM `accounting_sections`;--> statement-breakpoint
INSERT INTO `accounting_items` (`id`, `parent_id`, `prefix`, `position`, `description`, `created_at`, `updated_at`, `deleted_at`)
  SELECT l.`id` + (SELECT COALESCE(MAX(`id`), 0) FROM `accounting_sections`), l.`section_id`, NULL, l.`position`, l.`description`, l.`created_at`, l.`updated_at`, l.`deleted_at`
  FROM `accounting_lines` l;--> statement-breakpoint
INSERT INTO `accounting_entries` (`item_id`, `year`, `type`, `amount`, `label`, `created_at`, `updated_at`, `deleted_at`)
  SELECT a.`line_id` + (SELECT COALESCE(MAX(`id`), 0) FROM `accounting_sections`), a.`year`, 'actual', a.`amount`, NULL, a.`updated_at`, a.`updated_at`, NULL
  FROM `accounting_amounts` a;--> statement-breakpoint
DROP TABLE `accounting_amounts`;--> statement-breakpoint
DROP TABLE `accounting_lines`;--> statement-breakpoint
DROP TABLE `accounting_sections`;