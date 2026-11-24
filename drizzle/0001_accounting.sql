CREATE TABLE `accounting_amounts` (
	`line_id` integer NOT NULL,
	`year` integer NOT NULL,
	`amount` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`line_id`, `year`),
	FOREIGN KEY (`line_id`) REFERENCES `accounting_lines`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "accounting_amounts_amount_check" CHECK("accounting_amounts"."amount" >= 0)
);
--> statement-breakpoint
CREATE INDEX `accounting_amounts_year_idx` ON `accounting_amounts` (`year`);--> statement-breakpoint
CREATE TABLE `accounting_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` integer NOT NULL,
	`position` integer NOT NULL,
	`description` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`section_id`) REFERENCES `accounting_sections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `accounting_lines_section_position_idx` ON `accounting_lines` (`section_id`,`position`);--> statement-breakpoint
CREATE TABLE `accounting_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prefix` text NOT NULL,
	`position` integer NOT NULL,
	`description` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "accounting_sections_prefix_check" CHECK("accounting_sections"."prefix" NOT GLOB '*[^ABD-PR-TVYZ]*' AND length("accounting_sections"."prefix") BETWEEN 1 AND 3)
);
--> statement-breakpoint
CREATE INDEX `accounting_sections_prefix_position_idx` ON `accounting_sections` (`prefix`,`position`);