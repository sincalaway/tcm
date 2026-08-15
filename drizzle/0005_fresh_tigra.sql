CREATE TABLE `classic_passage_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`passageId` int NOT NULL,
	`editionLabel` varchar(255) NOT NULL,
	`text` text NOT NULL,
	`variantNote` text,
	`verificationStatus` enum('verified','pending','reference_only') NOT NULL DEFAULT 'pending',
	`sourceReference` varchar(255) NOT NULL,
	`sourceUrl` varchar(1024) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classic_passage_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `classic_passage_version_unique` UNIQUE(`passageId`,`editionLabel`)
);
--> statement-breakpoint
CREATE INDEX `classic_passage_versions_passage_idx` ON `classic_passage_versions` (`passageId`);--> statement-breakpoint
CREATE INDEX `classic_passage_versions_status_idx` ON `classic_passage_versions` (`verificationStatus`);