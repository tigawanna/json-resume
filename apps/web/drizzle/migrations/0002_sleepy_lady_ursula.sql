CREATE TABLE `resume_ai_chat` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resume_id` text NOT NULL,
	`messages` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_ai_chat_userId_idx` ON `resume_ai_chat` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_ai_chat_resumeId_idx` ON `resume_ai_chat` (`resume_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_ai_chat_userId_resumeId_idx` ON `resume_ai_chat` (`user_id`,`resume_id`);