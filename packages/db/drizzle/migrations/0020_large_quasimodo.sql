CREATE TABLE `rate_limit_counter` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`blocked_until` integer DEFAULT 0 NOT NULL
);
