CREATE TABLE `license_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseKey` varchar(32) NOT NULL,
	`maxUploads` int NOT NULL DEFAULT 3,
	`validDays` int NOT NULL DEFAULT 30,
	`note` text,
	`status` enum('active','used','disabled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `license_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `license_keys_licenseKey_unique` UNIQUE(`licenseKey`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseKeyId` int NOT NULL,
	`licenseKey` varchar(32) NOT NULL,
	`displayName` varchar(100),
	`usedUploads` int NOT NULL DEFAULT 0,
	`maxUploads` int NOT NULL DEFAULT 3,
	`activatedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`tenantStatus` enum('active','expired','disabled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `shelf_data` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `upload_sessions` ADD `tenantId` int;