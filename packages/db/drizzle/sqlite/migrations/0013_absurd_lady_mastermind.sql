CREATE TABLE `application_answer` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`question` text DEFAULT '' NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`resume_id` text,
	`job_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `application_answer_userId_idx` ON `application_answer` (`user_id`);--> statement-breakpoint
CREATE INDEX `application_answer_userId_updatedAt_idx` ON `application_answer` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `application_answer_jobId_idx` ON `application_answer` (`job_id`);--> statement-breakpoint
CREATE INDEX `application_answer_resumeId_idx` ON `application_answer` (`resume_id`);