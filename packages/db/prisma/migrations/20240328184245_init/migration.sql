-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `uid` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `userType` ENUM('ADMIN', 'STUDENT') NOT NULL,
    `studentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_uid_key`(`uid`),
    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_studentId_key`(`studentId`),
    INDEX `User_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `University` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `universityId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Department_code_key`(`code`),
    INDEX `Department_universityId_idx`(`universityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Student` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `universityId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,

    UNIQUE INDEX `Student_userId_key`(`userId`),
    INDEX `Student_universityId_idx`(`universityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Grade` (
    `id` VARCHAR(191) NOT NULL,
    `gradeCode` VARCHAR(191) NOT NULL,
    `gradeNumericValue` INTEGER NOT NULL,
    `gradeQualityPoints` INTEGER NOT NULL,
    `gradeAttemptedInd` BOOLEAN NOT NULL,
    `gradeCompletedInd` BOOLEAN NOT NULL,
    `gradePassedInd` BOOLEAN NOT NULL,
    `gradeGPAInd` BOOLEAN NOT NULL,
    `gradeTraditionalInd` BOOLEAN NOT NULL,
    `gradeRepeatIncludeInd` BOOLEAN NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Course` (
    `id` VARCHAR(191) NOT NULL,
    `courseSubject` VARCHAR(191) NOT NULL,
    `courseNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startTerm` INTEGER NULL,
    `endTerm` INTEGER NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `universityId` VARCHAR(191) NULL,

    INDEX `Course_departmentId_idx`(`departmentId`),
    INDEX `Course_universityId_idx`(`universityId`),
    UNIQUE INDEX `Course_courseNumber_courseSubject_key`(`courseNumber`, `courseSubject`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConditionGroup` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `logicalOperator` ENUM('AND', 'OR') NULL,

    INDEX `ConditionGroup_courseId_idx`(`courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Condition` (
    `id` VARCHAR(191) NOT NULL,
    `conditionGroupId` VARCHAR(191) NOT NULL,
    `minimumGrade` VARCHAR(191) NULL,
    `type` ENUM('PREREQUISITE', 'COREQUISITE') NOT NULL,

    INDEX `Condition_conditionGroupId_idx`(`conditionGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Prerequisite` (
    `id` VARCHAR(191) NOT NULL,
    `conditionId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,

    INDEX `Prerequisite_courseId_idx`(`courseId`),
    INDEX `Prerequisite_conditionId_idx`(`conditionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DegreeData` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `degreeSequenceNumber` INTEGER NOT NULL,
    `degreeTerm` VARCHAR(191) NOT NULL,
    `degreeCode` VARCHAR(191) NOT NULL,
    `cipDegree` VARCHAR(191) NOT NULL,
    `degreeStatus` ENUM('AW', 'DE') NOT NULL,

    INDEX `DegreeData_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Program` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `totalDegreeHours` INTEGER NOT NULL,
    `universityId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,

    INDEX `Program_universityId_idx`(`universityId`),
    INDEX `Program_departmentId_idx`(`departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProgramCourse` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `semester` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `programId` VARCHAR(191) NOT NULL,

    INDEX `ProgramCourse_courseId_idx`(`courseId`),
    INDEX `ProgramCourse_programId_idx`(`programId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ElectiveCourse` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,

    INDEX `ElectiveCourse_courseId_idx`(`courseId`),
    INDEX `ElectiveCourse_programId_idx`(`programId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlternativeCourse` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `altCourse` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(191) NOT NULL,

    INDEX `AlternativeCourse_courseId_idx`(`courseId`),
    INDEX `AlternativeCourse_programId_idx`(`programId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UniversityGrade` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `term` INTEGER NOT NULL,
    `finalGrade` VARCHAR(191) NOT NULL,
    `creditHours` INTEGER NOT NULL,
    `repeatCourse` BOOLEAN NULL DEFAULT false,
    `courseId` VARCHAR(191) NOT NULL,

    INDEX `UniversityGrade_courseId_idx`(`courseId`),
    INDEX `UniversityGrade_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransferGrade` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `sbgiCode` VARCHAR(191) NOT NULL,
    `sbgiDesc` VARCHAR(191) NOT NULL,
    `term` INTEGER NOT NULL,
    `courseSeqNo` INTEGER NOT NULL,
    `courseSubject` VARCHAR(191) NOT NULL,
    `courseNumber` VARCHAR(191) NOT NULL,
    `courseTitle` VARCHAR(191) NOT NULL,
    `creditHours` INTEGER NOT NULL,
    `equivalentGrade` VARCHAR(191) NOT NULL,
    `transferGrade` VARCHAR(191) NOT NULL,
    `countInGPA` VARCHAR(191) NOT NULL,
    `repeatCourse` BOOLEAN NOT NULL DEFAULT false,

    INDEX `TransferGrade_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Schedule` (
    `id` VARCHAR(191) NOT NULL,
    `userID` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activeDraftId` VARCHAR(191) NULL,

    UNIQUE INDEX `Schedule_userID_key`(`userID`),
    INDEX `Schedule_userID_idx`(`userID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Version` (
    `id` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `blob` JSON NOT NULL,

    INDEX `Version_scheduleId_idx`(`scheduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
