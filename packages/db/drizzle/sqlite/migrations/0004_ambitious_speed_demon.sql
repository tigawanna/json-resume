CREATE TABLE `job` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`company` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`description` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'saved' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`applied_at` integer,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_userId_idx` ON `job` (`user_id`);--> statement-breakpoint
CREATE INDEX `job_userId_updatedAt_idx` ON `job` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `job_status_idx` ON `job` (`status`);--> statement-breakpoint
ALTER TABLE `resume` ADD `job_id` text;--> statement-breakpoint
CREATE INDEX `resume_jobId_idx` ON `resume` (`job_id`);