CREATE TABLE `resume_certification_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`certification_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`certification_id`) REFERENCES `resume_certification`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_certification_item_resumeId_idx` ON `resume_certification_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_certification_item_certificationId_idx` ON `resume_certification_item` (`certification_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_certification_item_unique_idx` ON `resume_certification_item` (`resume_id`,`certification_id`);--> statement-breakpoint
CREATE TABLE `resume_contact_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `resume_contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_contact_item_resumeId_idx` ON `resume_contact_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_contact_item_contactId_idx` ON `resume_contact_item` (`contact_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_contact_item_unique_idx` ON `resume_contact_item` (`resume_id`,`contact_id`);--> statement-breakpoint
CREATE TABLE `resume_education_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`education_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`education_id`) REFERENCES `resume_education`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_education_item_resumeId_idx` ON `resume_education_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_education_item_educationId_idx` ON `resume_education_item` (`education_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_education_item_unique_idx` ON `resume_education_item` (`resume_id`,`education_id`);--> statement-breakpoint
CREATE TABLE `resume_experience_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`experience_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`experience_id`) REFERENCES `resume_experience`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_experience_item_resumeId_idx` ON `resume_experience_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_experience_item_experienceId_idx` ON `resume_experience_item` (`experience_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_experience_item_unique_idx` ON `resume_experience_item` (`resume_id`,`experience_id`);--> statement-breakpoint
CREATE TABLE `resume_language_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`language_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`language_id`) REFERENCES `resume_language`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_language_item_resumeId_idx` ON `resume_language_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_language_item_languageId_idx` ON `resume_language_item` (`language_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_language_item_unique_idx` ON `resume_language_item` (`resume_id`,`language_id`);--> statement-breakpoint
CREATE TABLE `resume_link_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`link_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`link_id`) REFERENCES `resume_link`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_link_item_resumeId_idx` ON `resume_link_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_link_item_linkId_idx` ON `resume_link_item` (`link_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_link_item_unique_idx` ON `resume_link_item` (`resume_id`,`link_id`);--> statement-breakpoint
CREATE TABLE `resume_project_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`project_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `resume_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_project_item_resumeId_idx` ON `resume_project_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_project_item_projectId_idx` ON `resume_project_item` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_project_item_unique_idx` ON `resume_project_item` (`resume_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `resume_skill_group_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`group_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `resume_skill_group`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_skill_group_item_resumeId_idx` ON `resume_skill_group_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_skill_group_item_groupId_idx` ON `resume_skill_group_item` (`group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_skill_group_item_unique_idx` ON `resume_skill_group_item` (`resume_id`,`group_id`);--> statement-breakpoint
CREATE TABLE `resume_summary_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`summary_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`summary_id`) REFERENCES `resume_summary`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_summary_item_resumeId_idx` ON `resume_summary_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_summary_item_summaryId_idx` ON `resume_summary_item` (`summary_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_summary_item_unique_idx` ON `resume_summary_item` (`resume_id`,`summary_id`);--> statement-breakpoint
CREATE TABLE `resume_talk_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`talk_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`talk_id`) REFERENCES `resume_talk`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_talk_item_resumeId_idx` ON `resume_talk_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_talk_item_talkId_idx` ON `resume_talk_item` (`talk_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_talk_item_unique_idx` ON `resume_talk_item` (`resume_id`,`talk_id`);--> statement-breakpoint
CREATE TABLE `resume_volunteer_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`volunteer_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`volunteer_id`) REFERENCES `resume_volunteer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_volunteer_item_resumeId_idx` ON `resume_volunteer_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_volunteer_item_volunteerId_idx` ON `resume_volunteer_item` (`volunteer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_volunteer_item_unique_idx` ON `resume_volunteer_item` (`resume_id`,`volunteer_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_resume_certification` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`name` text NOT NULL,
	`issuer` text DEFAULT '' NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_certification`("id", "resume_id", "name", "issuer", "date", "url", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "name", "issuer", "date", "url", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_certification"."resume_id") FROM `resume_certification`;--> statement-breakpoint
DROP TABLE `resume_certification`;--> statement-breakpoint
ALTER TABLE `__new_resume_certification` RENAME TO `resume_certification`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `resume_certification_userId_idx` ON `resume_certification` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_certification_resumeId_idx` ON `resume_certification` (`resume_id`);--> statement-breakpoint
CREATE TABLE `__new_resume_contact` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_contact`("id", "resume_id", "type", "value", "label", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "type", "value", "label", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_contact"."resume_id") FROM `resume_contact`;--> statement-breakpoint
DROP TABLE `resume_contact`;--> statement-breakpoint
ALTER TABLE `__new_resume_contact` RENAME TO `resume_contact`;--> statement-breakpoint
CREATE INDEX `resume_contact_userId_idx` ON `resume_contact` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_contact_resumeId_idx` ON `resume_contact` (`resume_id`);--> statement-breakpoint
CREATE TABLE `__new_resume_education` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`school` text NOT NULL,
	`degree` text DEFAULT '' NOT NULL,
	`field` text DEFAULT '' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_education`("id", "resume_id", "school", "degree", "field", "start_date", "end_date", "description", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "school", "degree", "field", "start_date", "end_date", "description", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_education"."resume_id") FROM `resume_education`;--> statement-breakpoint
DROP TABLE `resume_education`;--> statement-breakpoint
ALTER TABLE `__new_resume_education` RENAME TO `resume_education`;--> statement-breakpoint
CREATE INDEX `resume_education_userId_idx` ON `resume_education` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_education_resumeId_idx` ON `resume_education` (`resume_id`);--> statement-breakpoint
CREATE TABLE `__new_resume_experience` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_experience`("id", "resume_id", "company", "role", "start_date", "end_date", "location", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "company", "role", "start_date", "end_date", "location", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_experience"."resume_id") FROM `resume_experience`;--> statement-breakpoint
DROP TABLE `resume_experience`;--> statement-breakpoint
ALTER TABLE `__new_resume_experience` RENAME TO `resume_experience`;--> statement-breakpoint
CREATE INDEX `resume_experience_userId_idx` ON `resume_experience` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_experience_resumeId_idx` ON `resume_experience` (`resume_id`);--> statement-breakpoint
CREATE TABLE `__new_resume_language` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`name` text NOT NULL,
	`proficiency` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_language`("id", "resume_id", "name", "proficiency", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "name", "proficiency", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_language"."resume_id") FROM `resume_language`;--> statement-breakpoint
DROP TABLE `resume_language`;--> statement-breakpoint
ALTER TABLE `__new_resume_language` RENAME TO `resume_language`;--> statement-breakpoint
CREATE INDEX `resume_language_userId_idx` ON `resume_language` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_language_resumeId_idx` ON `resume_language` (`resume_id`);--> statement-breakpoint
CREATE TABLE `__new_resume_link` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_link`("id", "resume_id", "label", "url", "icon", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "label", "url", "icon", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_link"."resume_id") FROM `resume_link`;--> statement-breakpoint
DROP TABLE `resume_link`;--> statement-breakpoint
ALTER TABLE `__new_resume_link` RENAME TO `resume_link`;--> statement-breakpoint
CREATE INDEX `resume_link_userId_idx` ON `resume_link` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_link_resumeId_idx` ON `resume_link` (`resume_id`);--> statement-breakpoint
CREATE TABLE `__new_resume_project` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`name` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`homepage_url` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`tech` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_project`("id", "resume_id", "name", "url", "homepage_url", "description", "tech", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "name", "url", "homepage_url", "description", "tech", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_project"."resume_id") FROM `resume_project`;--> statement-breakpoint
DROP TABLE `resume_project`;--> statement-breakpoint
ALTER TABLE `__new_resume_project` RENAME TO `resume_project`;--> statement-breakpoint
CREATE INDEX `resume_project_userId_idx` ON `resume_project` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_project_resumeId_idx` ON `resume_project` (`resume_id`);--> statement-breakpoint
CREATE TABLE `__new_resume_skill_group` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_skill_group`("id", "resume_id", "name", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "name", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_skill_group"."resume_id") FROM `resume_skill_group`;--> statement-breakpoint
DROP TABLE `resume_skill_group`;--> statement-breakpoint
ALTER TABLE `__new_resume_skill_group` RENAME TO `resume_skill_group`;--> statement-breakpoint
CREATE INDEX `resume_skill_group_userId_idx` ON `resume_skill_group` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_skill_group_resumeId_idx` ON `resume_skill_group` (`resume_id`);--> statement-breakpoint
CREATE TABLE `__new_resume_summary` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`text` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_summary`("id", "resume_id", "text", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "text", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_summary"."resume_id") FROM `resume_summary`;--> statement-breakpoint
DROP TABLE `resume_summary`;--> statement-breakpoint
ALTER TABLE `__new_resume_summary` RENAME TO `resume_summary`;--> statement-breakpoint
CREATE INDEX `resume_summary_userId_idx` ON `resume_summary` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_summary_resumeId_idx` ON `resume_summary` (`resume_id`);--> statement-breakpoint
CREATE TABLE `__new_resume_talk` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`title` text NOT NULL,
	`event` text DEFAULT '' NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_talk`("id", "resume_id", "title", "event", "date", "description", "links", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "title", "event", "date", "description", "links", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_talk"."resume_id") FROM `resume_talk`;--> statement-breakpoint
DROP TABLE `resume_talk`;--> statement-breakpoint
ALTER TABLE `__new_resume_talk` RENAME TO `resume_talk`;--> statement-breakpoint
CREATE INDEX `resume_talk_userId_idx` ON `resume_talk` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_talk_resumeId_idx` ON `resume_talk` (`resume_id`);--> statement-breakpoint
CREATE TABLE `__new_resume_volunteer` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text,
	`organization` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resume_volunteer`("id", "resume_id", "organization", "role", "start_date", "end_date", "description", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", "user_id") SELECT "id", "resume_id", "organization", "role", "start_date", "end_date", "description", "sort_order", "searchable_text", "embedding", "embedding_model", "created_at", "updated_at", (SELECT "user_id" FROM "resume" WHERE "resume"."id" = "resume_volunteer"."resume_id") FROM `resume_volunteer`;--> statement-breakpoint
DROP TABLE `resume_volunteer`;--> statement-breakpoint
ALTER TABLE `__new_resume_volunteer` RENAME TO `resume_volunteer`;--> statement-breakpoint
CREATE INDEX `resume_volunteer_userId_idx` ON `resume_volunteer` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_volunteer_resumeId_idx` ON `resume_volunteer` (`resume_id`);--> statement-breakpoint
INSERT INTO `resume_certification_item` (`id`, `resume_id`, `certification_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_certification` WHERE `resume_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `resume_contact_item` (`id`, `resume_id`, `contact_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_contact` WHERE `resume_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `resume_education_item` (`id`, `resume_id`, `education_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_education` WHERE `resume_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `resume_experience_item` (`id`, `resume_id`, `experience_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_experience` WHERE `resume_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `resume_language_item` (`id`, `resume_id`, `language_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_language` WHERE `resume_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `resume_link_item` (`id`, `resume_id`, `link_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_link` WHERE `resume_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `resume_project_item` (`id`, `resume_id`, `project_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_project` WHERE `resume_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `resume_skill_group_item` (`id`, `resume_id`, `group_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_skill_group` WHERE `resume_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `resume_summary_item` (`id`, `resume_id`, `summary_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_summary` WHERE `resume_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `resume_talk_item` (`id`, `resume_id`, `talk_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_talk` WHERE `resume_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `resume_volunteer_item` (`id`, `resume_id`, `volunteer_id`, `sort_order`, `created_at`, `updated_at`) SELECT lower(hex(randomblob(16))), `resume_id`, `id`, `sort_order`, `created_at`, `updated_at` FROM `resume_volunteer` WHERE `resume_id` IS NOT NULL;
