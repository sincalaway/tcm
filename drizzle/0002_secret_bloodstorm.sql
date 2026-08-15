CREATE TABLE `ai_study_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`contextKind` enum('herb','formula','chapter') NOT NULL,
	`contextTitle` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_study_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_study_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_study_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classic_passages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classicId` int NOT NULL,
	`chapterId` int NOT NULL,
	`passageNumber` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`excerpt` text NOT NULL,
	`keywords` varchar(512),
	`sourceReference` varchar(128) NOT NULL,
	`sourceUrl` varchar(1024) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classic_passages_id` PRIMARY KEY(`id`),
	CONSTRAINT `classic_passage_chapter_number_unique` UNIQUE(`chapterId`,`passageNumber`)
);
--> statement-breakpoint
CREATE TABLE `formula_passage_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formulaId` int NOT NULL,
	`passageId` int NOT NULL,
	`relationType` enum('primary','related') NOT NULL DEFAULT 'primary',
	`studyNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formula_passage_mappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `formula_passage_mapping_unique` UNIQUE(`formulaId`,`passageId`)
);
--> statement-breakpoint
CREATE TABLE `learning_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`metric` enum('path_steps','reading_entries','study_notes') NOT NULL,
	`targetCount` int NOT NULL,
	`deadlineAt` timestamp,
	`status` enum('active','completed','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_reminder_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reminderId` int NOT NULL,
	`userId` int NOT NULL,
	`dueAt` timestamp NOT NULL,
	`seenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_reminder_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_reminder_event_due_unique` UNIQUE(`reminderId`,`dueAt`)
);
--> statement-breakpoint
CREATE TABLE `review_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`goalId` int,
	`title` varchar(255) NOT NULL,
	`intervalDays` int NOT NULL,
	`hourUtc` int NOT NULL DEFAULT 12,
	`enabled` int NOT NULL DEFAULT 1,
	`scheduleCronTaskUid` varchar(65),
	`nextReviewAt` timestamp NOT NULL,
	`lastTriggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_reminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_reminder_schedule_uid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE INDEX `ai_study_conversations_user_idx` ON `ai_study_conversations` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `ai_study_conversations_context_idx` ON `ai_study_conversations` (`userId`,`contextKind`,`contextTitle`);--> statement-breakpoint
CREATE INDEX `ai_study_messages_conversation_idx` ON `ai_study_messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `classic_passage_classic_idx` ON `classic_passages` (`classicId`,`chapterId`);--> statement-breakpoint
CREATE INDEX `classic_passage_title_idx` ON `classic_passages` (`title`);--> statement-breakpoint
CREATE INDEX `formula_passage_formula_idx` ON `formula_passage_mappings` (`formulaId`);--> statement-breakpoint
CREATE INDEX `formula_passage_passage_idx` ON `formula_passage_mappings` (`passageId`);--> statement-breakpoint
CREATE INDEX `learning_goals_user_idx` ON `learning_goals` (`userId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `review_reminder_events_user_idx` ON `review_reminder_events` (`userId`,`seenAt`,`dueAt`);--> statement-breakpoint
CREATE INDEX `review_reminders_user_idx` ON `review_reminders` (`userId`,`enabled`,`nextReviewAt`);