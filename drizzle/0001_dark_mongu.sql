CREATE TABLE `shelf_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`category1` varchar(100),
	`category2` varchar(100),
	`category3` varchar(100),
	`category4` varchar(100),
	`productCode` varchar(100) NOT NULL,
	`productName` varchar(255),
	`shelfCode` varchar(100) NOT NULL,
	`shelfLevel` int,
	`positionCode` varchar(100),
	`facingCount` int,
	`displayLevel` int,
	`stackCount` int,
	`salesQty` int,
	`salesAmount` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shelf_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upload_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`totalRows` int NOT NULL DEFAULT 0,
	`shelfCount` int NOT NULL DEFAULT 0,
	`productCount` int NOT NULL DEFAULT 0,
	`uploadedBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `upload_sessions_id` PRIMARY KEY(`id`)
);
