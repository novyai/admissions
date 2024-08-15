/*
  Warnings:

  - You are about to drop the column `endTerm` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `startTerm` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `Program` table. All the data in the column will be lost.
  - You are about to drop the `AlternativeCourse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ElectiveCourse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProgramCourse` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code,universityId]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `creditHours` to the `Course` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Department_code_key` ON `Department`;

-- DropIndex
DROP INDEX `Program_departmentId_idx` ON `Program`;

-- AlterTable
ALTER TABLE `Course` DROP COLUMN `endTerm`,
    DROP COLUMN `startTerm`,
    ADD COLUMN `creditHours` INTEGER NOT NULL,
    ADD COLUMN `description` TEXT NULL;

-- AlterTable
ALTER TABLE `Program` DROP COLUMN `departmentId`;

-- DropTable
DROP TABLE `AlternativeCourse`;

-- DropTable
DROP TABLE `ElectiveCourse`;

-- DropTable
DROP TABLE `ProgramCourse`;

-- CreateTable
CREATE TABLE `SemestersOffered` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `semester` ENUM('FALL', 'SPRING', 'WINTER', 'SUMMER') NOT NULL,

    INDEX `SemestersOffered_courseId_idx`(`courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourseRequisites` (
    `courseId` VARCHAR(191) NOT NULL,
    `requisitesId` VARCHAR(191) NOT NULL,

    INDEX `CourseRequisites_requisitesId_idx`(`requisitesId`),
    UNIQUE INDEX `CourseRequisites_courseId_requisitesId_key`(`courseId`, `requisitesId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Track` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(191) NOT NULL,

    INDEX `Track_programId_idx`(`programId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequirementGroup` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `trackId` VARCHAR(191) NOT NULL,

    INDEX `RequirementGroup_trackId_idx`(`trackId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequirementSubgroup` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `trackId` VARCHAR(191) NOT NULL,
    `requirementGroupId` VARCHAR(191) NOT NULL,

    INDEX `RequirementSubgroup_trackId_idx`(`trackId`),
    INDEX `RequirementSubgroup_requirementGroupId_idx`(`requirementGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Requirement` (
    `id` VARCHAR(191) NOT NULL,
    `trackId` VARCHAR(191) NOT NULL,
    `requirementGroupId` VARCHAR(191) NULL,
    `requirementSubgroupId` VARCHAR(191) NULL,
    `creditHoursNeeded` INTEGER NOT NULL,
    `nonOverlapping` BOOLEAN NOT NULL,

    INDEX `Requirement_trackId_idx`(`trackId`),
    INDEX `Requirement_requirementGroupId_idx`(`requirementGroupId`),
    INDEX `Requirement_requirementSubgroupId_idx`(`requirementSubgroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `summarizedUntil` DATETIME(3) NULL,
    `title` VARCHAR(191) NULL,
    `starter` JSON NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `userId` VARCHAR(191) NULL,
    `artifacts` JSON NULL,

    INDEX `Conversation_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConversationSummary` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `conversationId` VARCHAR(191) NOT NULL,
    `startingMessageId` VARCHAR(191) NOT NULL,
    `endingMessageId` VARCHAR(191) NOT NULL,
    `from` DATETIME(3) NOT NULL,
    `to` DATETIME(3) NOT NULL,
    `messageCount` INTEGER NOT NULL,
    `summary` LONGTEXT NOT NULL,
    `tokenCount` INTEGER NOT NULL,
    `userId` VARCHAR(191) NULL,

    UNIQUE INDEX `ConversationSummary_startingMessageId_key`(`startingMessageId`),
    UNIQUE INDEX `ConversationSummary_endingMessageId_key`(`endingMessageId`),
    INDEX `conversationId`(`conversationId`),
    INDEX `userId`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `role` ENUM('user', 'assistant', 'system', 'function') NOT NULL DEFAULT 'user',
    `tokenCount` INTEGER NOT NULL,
    `summarized` BOOLEAN NOT NULL DEFAULT false,
    `artifacts` JSON NULL,
    `userId` VARCHAR(191) NULL,
    `type` ENUM('TEXT', 'MARKDOWN') NOT NULL DEFAULT 'TEXT',

    INDEX `Message_conversationId_idx`(`conversationId`),
    INDEX `Message_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CourseToRequirement` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CourseToRequirement_AB_unique`(`A`, `B`),
    INDEX `_CourseToRequirement_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Course_id_idx` ON `Course`(`id`);

-- CreateIndex
CREATE UNIQUE INDEX `Department_code_universityId_key` ON `Department`(`code`, `universityId`);
