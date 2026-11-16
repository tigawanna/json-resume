CREATE TABLE `cover_letter` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`resume_id` text,
	`job_id` text,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cover_letter_userId_idx` ON `cover_letter` (`user_id`);--> statement-breakpoint
CREATE INDEX `cover_letter_userId_updatedAt_idx` ON `cover_letter` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `cover_letter_resumeId_idx` ON `cover_letter` (`resume_id`);