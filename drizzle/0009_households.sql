CREATE TABLE `households` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`sector_id` integer NOT NULL,
	`sponsor_id` integer,
	`last_child_rank` integer DEFAULT 2 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`sector_id`) REFERENCES `sectors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sponsor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "households_last_child_rank_check" CHECK("households"."last_child_rank" >= 2)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `households_number_unique_idx` ON `households` (`number`);--> statement-breakpoint
CREATE INDEX `households_sector_idx` ON `households` (`sector_id`);--> statement-breakpoint
CREATE INDEX `households_sponsor_idx` ON `households` (`sponsor_id`);--> statement-breakpoint
CREATE TABLE `sectors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sectors_number_unique_idx` ON `sectors` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `sectors_name_unique_idx` ON `sectors` ("name" COLLATE NOCASE);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` integer NOT NULL,
	`role` text NOT NULL,
	`rank` integer NOT NULL,
	`sex` text NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`birth_date` text NOT NULL,
	`address` text NOT NULL,
	`phone` text,
	`baptized` integer DEFAULT false NOT NULL,
	`communicant` integer DEFAULT false NOT NULL,
	`deacon` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "members_baptized_check" CHECK("__new_members"."baptized" IN (0, 1)),
	CONSTRAINT "members_communicant_check" CHECK("__new_members"."communicant" IN (0, 1)),
	CONSTRAINT "members_deacon_check" CHECK("__new_members"."deacon" IN (0, 1)),
	CONSTRAINT "members_communicant_baptized_check" CHECK("__new_members"."communicant" = 0 OR "__new_members"."baptized" = 1),
	CONSTRAINT "members_deacon_communicant_check" CHECK("__new_members"."deacon" = 0 OR "__new_members"."communicant" = 1),
	CONSTRAINT "members_role_check" CHECK("__new_members"."role" IN ('head', 'father', 'mother', 'child')),
	CONSTRAINT "members_sex_check" CHECK("__new_members"."sex" IN ('M', 'F')),
	CONSTRAINT "members_rank_check" CHECK(("__new_members"."role" IN ('head', 'father') AND "__new_members"."rank" = 1) OR ("__new_members"."role" = 'mother' AND "__new_members"."rank" = 2) OR ("__new_members"."role" = 'child' AND "__new_members"."rank" >= 3)),
	CONSTRAINT "members_father_sex_check" CHECK("__new_members"."role" <> 'father' OR "__new_members"."sex" = 'M'),
	CONSTRAINT "members_mother_sex_check" CHECK("__new_members"."role" <> 'mother' OR "__new_members"."sex" = 'F')
);
--> statement-breakpoint
-- Reprise écrite à la main (spec 2026-11-27-foyers-secteurs, par. 5.4) : les fidèles d'avant
-- les foyers ne sont PAS repris. Aucune version installée à l'église ne les contient (fixture
-- v0.1.0 antérieure à 0006) : seules des données de dev ou de démo, gardées par la sauvegarde
-- automatique avant migration. Un fidèle exige désormais un foyer, que l'ancienne table n'a pas.
SELECT 1;--> statement-breakpoint
DROP TABLE `members`;--> statement-breakpoint
ALTER TABLE `__new_members` RENAME TO `members`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `members_name_unique_idx` ON `members` (`last_name`,`first_name`) WHERE "members"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `members_rank_unique_idx` ON `members` (`household_id`,`rank`) WHERE "members"."deleted_at" IS NULL;