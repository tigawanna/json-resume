DROP TABLE `resume_section`;--> statement-breakpoint
DROP TABLE `resume_certification_item`;--> statement-breakpoint
DROP TABLE `resume_contact_item`;--> statement-breakpoint
DROP TABLE `resume_education_item`;--> statement-breakpoint
DROP TABLE `resume_experience_bullet_item`;--> statement-breakpoint
DROP TABLE `resume_experience_item`;--> statement-breakpoint
DROP TABLE `resume_language_item`;--> statement-breakpoint
DROP TABLE `resume_link_item`;--> statement-breakpoint
DROP TABLE `resume_note_item`;--> statement-breakpoint
DROP TABLE `resume_project_item`;--> statement-breakpoint
DROP TABLE `resume_skill_group_item`;--> statement-breakpoint
DROP TABLE `resume_skill_group_skill`;--> statement-breakpoint
DROP TABLE `resume_summary_item`;--> statement-breakpoint
DROP TABLE `resume_talk_item`;--> statement-breakpoint
DROP TABLE `resume_volunteer_item`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_resume_skill` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`level` text,
	`group_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_resume_skill`("id", "user_id", "name", "level", "group_id", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at") SELECT "id", "user_id", "name", "level", "group_id", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at" FROM `resume_skill`;--> statement-breakpoint
DROP TABLE `resume_skill`;--> statement-breakpoint
ALTER TABLE `__new_resume_skill` RENAME TO `resume_skill`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `resume_skill_userId_idx` ON `resume_skill` (`user_id`);