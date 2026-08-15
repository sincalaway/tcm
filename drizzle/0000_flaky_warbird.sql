CREATE TABLE `classic_chapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classicId` int NOT NULL,
	`sequence` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`excerpt` text,
	`sourceUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classic_chapters_id` PRIMARY KEY(`id`),
	CONSTRAINT `classic_chapter_sequence_unique` UNIQUE(`classicId`,`sequence`)
);
--> statement-breakpoint
CREATE TABLE `classics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`era` varchar(128),
	`author` varchar(255),
	`category` varchar(128),
	`summary` text,
	`sourceId` int,
	`sourceUrl` varchar(1024) NOT NULL,
	`reviewedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classics_id` PRIMARY KEY(`id`),
	CONSTRAINT `classics_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `content_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(96) NOT NULL,
	`name` varchar(255) NOT NULL,
	`publisher` varchar(255),
	`baseUrl` varchar(1024) NOT NULL,
	`accessType` enum('catalog','api','manual') NOT NULL,
	`licenseNote` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_sources_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `formulas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(128) NOT NULL,
	`name` varchar(128) NOT NULL,
	`aliases` text,
	`sourceTitle` varchar(255) NOT NULL,
	`sourceExcerpt` text,
	`ingredients` text NOT NULL,
	`structuralNote` text,
	`studyIndex` varchar(512),
	`sourceId` int,
	`sourceUrl` varchar(1024),
	`reviewedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formulas_id` PRIMARY KEY(`id`),
	CONSTRAINT `formulas_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `herbs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(128) NOT NULL,
	`name` varchar(128) NOT NULL,
	`pinyin` varchar(255),
	`aliases` text,
	`category` varchar(128),
	`nature` varchar(64),
	`taste` varchar(128),
	`meridians` varchar(255),
	`medicinalPart` varchar(255),
	`traditionalIndex` text,
	`learningNote` text,
	`sourceId` int,
	`sourceUrl` varchar(1024),
	`reviewedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `herbs_id` PRIMARY KEY(`id`),
	CONSTRAINT `herbs_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`classicId` int NOT NULL,
	`chapterId` int,
	`progressPercent` int NOT NULL DEFAULT 0,
	`lastReadAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reading_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `reading_progress_unique` UNIQUE(`userId`,`classicId`)
);
--> statement-breakpoint
CREATE TABLE `saved_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resourceType` enum('herb','formula','classic','chapter') NOT NULL,
	`resourceId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_item_unique` UNIQUE(`userId`,`resourceType`,`resourceId`)
);
--> statement-breakpoint
CREATE TABLE `study_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resourceType` enum('herb','formula','classic','chapter') NOT NULL,
	`resourceId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `study_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `classic_chapters_title_idx` ON `classic_chapters` (`title`);--> statement-breakpoint
CREATE INDEX `classics_title_idx` ON `classics` (`title`);--> statement-breakpoint
CREATE INDEX `formulas_name_idx` ON `formulas` (`name`);--> statement-breakpoint
CREATE INDEX `formulas_source_title_idx` ON `formulas` (`sourceTitle`);--> statement-breakpoint
CREATE INDEX `herbs_name_idx` ON `herbs` (`name`);--> statement-breakpoint
CREATE INDEX `herbs_category_idx` ON `herbs` (`category`);--> statement-breakpoint
CREATE INDEX `reading_progress_user_idx` ON `reading_progress` (`userId`,`lastReadAt`);--> statement-breakpoint
CREATE INDEX `saved_items_user_idx` ON `saved_items` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `study_notes_user_idx` ON `study_notes` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `study_notes_resource_idx` ON `study_notes` (`resourceType`,`resourceId`);