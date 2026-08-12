CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentKey` varchar(64) NOT NULL,
	`apiTokenHash` varchar(128) NOT NULL,
	`hostName` varchar(255) NOT NULL,
	`siteId` int NOT NULL,
	`ipAddress` varchar(64),
	`osVersion` varchar(255),
	`agentVersion` varchar(64),
	`status` enum('online','offline','degraded') NOT NULL DEFAULT 'offline',
	`defenderEnabled` boolean NOT NULL DEFAULT false,
	`signatureVersion` varchar(128),
	`signatureUpdatedAt` timestamp,
	`lastHeartbeatAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `agents_agent_key_unique` UNIQUE(`agentKey`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(128) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `defender_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`realtimeProtection` boolean NOT NULL DEFAULT false,
	`antivirusEnabled` boolean NOT NULL DEFAULT false,
	`signatureVersion` varchar(128),
	`engineVersion` varchar(128),
	`lastUpdatedAt` timestamp,
	`collectedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `defender_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspection_commands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`commandType` enum('Full Scan','Quick Scan','서명 업데이트') NOT NULL,
	`status` enum('queued','running','succeeded','failed') NOT NULL DEFAULT 'queued',
	`requestedBy` int NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`finishedAt` timestamp,
	`resultMessage` text,
	CONSTRAINT `inspection_commands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quarantine_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`originalPath` text,
	`threatName` varchar(255) NOT NULL,
	`detectedAt` timestamp NOT NULL,
	`sha256` varchar(128),
	`status` enum('quarantined','removed','restored','unknown') NOT NULL DEFAULT 'quarantined',
	`externalId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quarantine_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rdp_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`userId` int NOT NULL,
	`path` enum('internal','external') NOT NULL,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`recordingFilePath` text,
	`connectionTokenHash` varchar(128),
	`tokenExpiresAt` timestamp,
	`tokenConsumedAt` timestamp,
	CONSTRAINT `rdp_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registration_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`tokenPrefix` varchar(16) NOT NULL,
	`siteId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registration_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `registration_tokens_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sites_id` PRIMARY KEY(`id`),
	CONSTRAINT `sites_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE INDEX `agents_site_idx` ON `agents` (`siteId`);--> statement-breakpoint
CREATE INDEX `agents_heartbeat_idx` ON `agents` (`lastHeartbeatAt`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `defender_status_agent_idx` ON `defender_status` (`agentId`);--> statement-breakpoint
CREATE INDEX `defender_status_collected_idx` ON `defender_status` (`collectedAt`);--> statement-breakpoint
CREATE INDEX `inspection_commands_agent_idx` ON `inspection_commands` (`agentId`);--> statement-breakpoint
CREATE INDEX `inspection_commands_status_idx` ON `inspection_commands` (`status`);--> statement-breakpoint
CREATE INDEX `quarantine_agent_idx` ON `quarantine_records` (`agentId`);--> statement-breakpoint
CREATE INDEX `quarantine_detected_idx` ON `quarantine_records` (`detectedAt`);--> statement-breakpoint
CREATE INDEX `rdp_sessions_agent_idx` ON `rdp_sessions` (`agentId`);--> statement-breakpoint
CREATE INDEX `rdp_sessions_user_idx` ON `rdp_sessions` (`userId`);