CREATE TABLE `sync_squash_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`squashed_through_seq` integer DEFAULT 0 NOT NULL,
	`squashed_at` integer,
	`removed_events` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sync_squash_state_squashedAt_idx` ON `sync_squash_state` (`squashed_at`);--> statement-breakpoint
CREATE INDEX `sync_event_userRow_idx` ON `sync_event` (`user_id`,`collection_id`,`key`,`global_seq`);