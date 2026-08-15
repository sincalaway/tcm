CREATE TABLE `ai_study_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`sourceMessageCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_study_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_study_summary_conversation_unique` UNIQUE(`conversationId`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`sizeBytes` int NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`textPreview` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `knowledge_documents_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE INDEX `ai_study_summaries_user_idx` ON `ai_study_summaries` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `knowledge_documents_user_idx` ON `knowledge_documents` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `knowledge_documents_title_idx` ON `knowledge_documents` (`userId`,`title`);