CREATE TABLE `resume_note` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text DEFAULT 'Notes' NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`searchable_text` text DEFAULT '' NOT NULL,
	`embedding` blob,
	`embedding_model` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE INDEX `resume_note_userId_idx` ON `resume_note` (`user_id`);--> statement-breakpoint
CREATE TABLE `resume_note_item` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`note_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `resume_note`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_note_item_resumeId_idx` ON `resume_note_item` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_note_item_noteId_idx` ON `resume_note_item` (`note_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `resume_note_item_unique_idx` ON `resume_note_item` (`resume_id`,`note_id`);