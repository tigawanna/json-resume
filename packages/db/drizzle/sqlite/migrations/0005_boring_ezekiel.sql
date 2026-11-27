CREATE TABLE `public_resume` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_resume_id` text NOT NULL,
	`title` text NOT NULL,
	`document` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `public_resume_userId_idx` ON `public_resume` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `public_resume_userId_sourceResumeId_idx` ON `public_resume` (`user_id`,`source_resume_id`);