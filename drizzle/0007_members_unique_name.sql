DROP INDEX `members_name_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `members_name_unique_idx` ON `members` (`last_name`,`first_name`) WHERE "members"."deleted_at" IS NULL;