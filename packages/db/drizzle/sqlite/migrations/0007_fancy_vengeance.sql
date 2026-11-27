ALTER TABLE `resume_skill` ADD `user_id` text;--> statement-breakpoint
CREATE INDEX `resume_skill_userId_idx` ON `resume_skill` (`user_id`);