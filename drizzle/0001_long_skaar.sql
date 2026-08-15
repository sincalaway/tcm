CREATE TABLE `learning_path_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pathSlug` varchar(96) NOT NULL,
	`completedSteps` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_path_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `learning_path_progress_user_path_unique` UNIQUE(`userId`,`pathSlug`)
);
--> statement-breakpoint
CREATE INDEX `learning_path_progress_user_idx` ON `learning_path_progress` (`userId`,`updatedAt`);