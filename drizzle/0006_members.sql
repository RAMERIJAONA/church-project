CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`birth_date` text NOT NULL,
	`address` text NOT NULL,
	`phone` text,
	`sector` text,
	`baptized` integer DEFAULT false NOT NULL,
	`communicant` integer DEFAULT false NOT NULL,
	`registration_number` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "members_baptized_check" CHECK("members"."baptized" IN (0, 1)),
	CONSTRAINT "members_communicant_check" CHECK("members"."communicant" IN (0, 1)),
	CONSTRAINT "members_communicant_baptized_check" CHECK("members"."communicant" = 0 OR "members"."baptized" = 1)
);
--> statement-breakpoint
CREATE INDEX `members_name_idx` ON `members` (`last_name`,`first_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_registration_number_idx` ON `members` ("registration_number" COLLATE NOCASE) WHERE "members"."registration_number" IS NOT NULL AND "members"."deleted_at" IS NULL;