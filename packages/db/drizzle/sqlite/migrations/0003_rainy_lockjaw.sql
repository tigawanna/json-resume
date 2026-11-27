CREATE TABLE `sync_backend` (
	`id` integer PRIMARY KEY NOT NULL,
	`backend_id` text NOT NULL,
	`last_projected_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_event` (
	`global_seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`collection_id` text NOT NULL,
	`type` text NOT NULL,
	`key` text NOT NULL,
	`payload` text NOT NULL,
	`previous` text,
	`tx_id` text NOT NULL,
	`client_id` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`client_timestamp` integer NOT NULL,
	`server_timestamp` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`projected_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_event_eventId_idx` ON `sync_event` (`event_id`);--> statement-breakpoint
CREATE INDEX `sync_event_userId_globalSeq_idx` ON `sync_event` (`user_id`,`global_seq`);--> statement-breakpoint
CREATE INDEX `sync_event_row_idx` ON `sync_event` (`collection_id`,`key`,`global_seq`);--> statement-breakpoint
CREATE INDEX `sync_event_projectedAt_idx` ON `sync_event` (`projected_at`);