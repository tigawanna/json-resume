CREATE TABLE `resume_ai_conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resume_id` text NOT NULL,
	`title` text,
	`model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_ai_conversation_userId_idx` ON `resume_ai_conversation` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_ai_conversation_resumeId_idx` ON `resume_ai_conversation` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_ai_conversation_userId_updatedAt_idx` ON `resume_ai_conversation` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_ai_conversation_userId_resumeId_idx` ON `resume_ai_conversation` (`user_id`,`resume_id`);--> statement-breakpoint
CREATE TABLE `resume_ai_message` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`position` integer NOT NULL,
	`text_content` text DEFAULT '' NOT NULL,
	`parts` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `resume_ai_conversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_ai_message_conversationId_idx` ON `resume_ai_message` (`conversation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_ai_message_conversationId_position_idx` ON `resume_ai_message` (`conversation_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_ai_message_conversationId_messageId_idx` ON `resume_ai_message` (`conversation_id`,`message_id`);