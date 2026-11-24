PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_accounting_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`year` integer NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`label` text,
	`operated_on` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`item_id`) REFERENCES `accounting_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "accounting_entries_type_check" CHECK("__new_accounting_entries"."type" IN ('estimate', 'actual')),
	CONSTRAINT "accounting_entries_amount_check" CHECK("__new_accounting_entries"."amount" >= 0),
	CONSTRAINT "accounting_entries_operated_on_check" CHECK(("__new_accounting_entries"."type" = 'estimate' AND "__new_accounting_entries"."operated_on" IS NULL) OR ("__new_accounting_entries"."type" = 'actual' AND "__new_accounting_entries"."operated_on" IS NOT NULL AND CAST(substr("__new_accounting_entries"."operated_on", 1, 4) AS INTEGER) = "__new_accounting_entries"."year"))
);
--> statement-breakpoint
INSERT INTO `__new_accounting_entries`("id", "item_id", "year", "type", "amount", "label", "operated_on", "created_at", "updated_at", "deleted_at") SELECT "id", "item_id", "year", "type", "amount", "label",
  -- Reprise (écrite à la main) : une réalisation prend sa date de saisie si elle tombe dans
  -- l'année de la case, sinon le 31 décembre de cette année. Une estimation reste sans date.
  CASE
    WHEN "type" = 'actual' AND CAST(strftime('%Y', "created_at") AS INTEGER) = "year" THEN date("created_at")
    WHEN "type" = 'actual' THEN printf('%04d-12-31', "year")
    ELSE NULL
  END,
  "created_at", "updated_at", "deleted_at" FROM `accounting_entries`;--> statement-breakpoint
DROP TABLE `accounting_entries`;--> statement-breakpoint
ALTER TABLE `__new_accounting_entries` RENAME TO `accounting_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `accounting_entries_year_item_idx` ON `accounting_entries` (`year`,`item_id`);--> statement-breakpoint
CREATE INDEX `accounting_entries_operated_on_idx` ON `accounting_entries` (`operated_on`);