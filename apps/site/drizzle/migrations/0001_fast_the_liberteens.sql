CREATE TABLE `pinned_project` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`github_repo_id` integer NOT NULL,
	`name` text NOT NULL,
	`full_name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`repo_url` text NOT NULL,
	`homepage_url` text DEFAULT '' NOT NULL,
	`topics` text DEFAULT '[]' NOT NULL,
	`language` text DEFAULT '' NOT NULL,
	`stargazers_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pinned_project_userId_idx` ON `pinned_project` (`user_id`);--> statement-breakpoint
CREATE INDEX `pinned_project_userId_githubRepoId_idx` ON `pinned_project` (`user_id`,`github_repo_id`);