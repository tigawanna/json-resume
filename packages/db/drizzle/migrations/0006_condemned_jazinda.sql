CREATE TABLE `resume_experience_bullet_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`bullet_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bullet_id`) REFERENCES `resume_experience_bullet`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_exp_bullet_item_resumeId_idx` ON `resume_experience_bullet_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_exp_bullet_item_bulletId_idx` ON `resume_experience_bullet_item` (`bullet_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_exp_bullet_item_unique_idx` ON `resume_experience_bullet_item` (`resume_id`,`bullet_id`);--> statement-breakpoint
CREATE TABLE `resume_skill_group_skill` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `resume_skill_group`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `resume_skill`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_skill_group_skill_groupId_idx` ON `resume_skill_group_skill` (`group_id`);--> statement-breakpoint
CREATE INDEX `resume_skill_group_skill_skillId_idx` ON `resume_skill_group_skill` (`skill_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_skill_group_skill_unique_idx` ON `resume_skill_group_skill` (`group_id`,`skill_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_resume_skill` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text,
	`name` text NOT NULL,
	`level` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `resume_skill_group`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_resume_skill`("id", "group_id", "name", "level", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at") SELECT "id", "group_id", "name", "level", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at" FROM `resume_skill`;--> statement-breakpoint
DROP TABLE `resume_skill`;--> statement-breakpoint
ALTER TABLE `__new_resume_skill` RENAME TO `resume_skill`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `resume_skill_groupId_idx` ON `resume_skill` (`group_id`);