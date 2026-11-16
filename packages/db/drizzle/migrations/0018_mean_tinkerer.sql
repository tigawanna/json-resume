CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bucket` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`period_key` text,
	`resume_id` text,
	`idempotency_key` text NOT NULL,
	`reason` text,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_ledger_idempotencyKey_idx` ON `credit_ledger` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `credit_ledger_userId_createdAt_idx` ON `credit_ledger` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `credit_ledger_resumeId_idx` ON `credit_ledger` (`resume_id`);--> statement-breakpoint
CREATE TABLE `credit_wallet` (
	`user_id` text PRIMARY KEY NOT NULL,
	`monthly_balance` integer DEFAULT 0 NOT NULL,
	`bonus_balance` integer DEFAULT 0 NOT NULL,
	`monthly_period_key` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `credit_wallet_monthlyPeriodKey_idx` ON `credit_wallet` (`monthly_period_key`);--> statement-breakpoint
CREATE TABLE `waitlist_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`user_id` text,
	`status` text DEFAULT 'joined' NOT NULL,
	`source` text NOT NULL,
	`consent_at` integer NOT NULL,
	`claimed_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_entry_email_idx` ON `waitlist_entry` (`email`);--> statement-breakpoint
CREATE INDEX `waitlist_entry_status_createdAt_idx` ON `waitlist_entry` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `waitlist_entry_userId_idx` ON `waitlist_entry` (`user_id`);