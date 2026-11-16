CREATE TABLE `assistant_skill` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`scopes` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`builtin_key` text,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_skill_userId_idx` ON `assistant_skill` (`user_id`);--> statement-breakpoint
CREATE INDEX `assistant_skill_userId_updatedAt_idx` ON `assistant_skill` (`user_id`,`updated_at`);