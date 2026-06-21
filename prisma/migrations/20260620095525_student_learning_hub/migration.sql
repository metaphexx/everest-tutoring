-- CreateTable
CREATE TABLE "FileAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'upload',
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "originalName" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" TEXT NOT NULL DEFAULT 'clear',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Announcement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TutorResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileId" TEXT,
    "fileType" TEXT,
    "subject" TEXT NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "classId" TEXT,
    "uploadedByTutorId" TEXT NOT NULL,
    "weekNumber" INTEGER,
    "topic" TEXT,
    "visibleToStudents" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TutorResource_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAttachment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TutorResource_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TutorResource_uploadedByTutorId_fkey" FOREIGN KEY ("uploadedByTutorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentCourseOutline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "school" TEXT NOT NULL DEFAULT 'Harrisdale SHS',
    "term" TEXT,
    "fileId" TEXT,
    "assessmentCount" INTEGER NOT NULL DEFAULT 0,
    "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
    "extractedTopics" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'clear',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentCourseOutline_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentCourseOutline_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAttachment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'other',
    "subject" TEXT,
    "fileId" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'clear',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SchoolDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAttachment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "outlineId" TEXT,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'test',
    "dueWeek" INTEGER,
    "dueDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentAssessment_outlineId_fkey" FOREIGN KEY ("outlineId") REFERENCES "StudentCourseOutline" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private_to_tutor',
    "status" TEXT NOT NULL DEFAULT 'waiting_for_tutor',
    "topic" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'clear',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "pinnedReplyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Question_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Question_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isTutor" BOOLEAN NOT NULL DEFAULT false,
    "helpful" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" TEXT NOT NULL DEFAULT 'clear',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionReply_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuestionReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionReaction_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuestionReaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "outlineId" TEXT,
    "documentId" TEXT,
    "fileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionAttachment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuestionAttachment_outlineId_fkey" FOREIGN KEY ("outlineId") REFERENCES "StudentCourseOutline" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuestionAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SchoolDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuestionAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAttachment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "parentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "withdrawnAt" DATETIME,
    "exitReason" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "userId" TEXT,
    "invitedAt" DATETIME,
    "accountActivatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("createdAt", "exitReason", "firstName", "id", "lastName", "parentId", "status", "withdrawnAt", "yearLevel") SELECT "createdAt", "exitReason", "firstName", "id", "lastName", "parentId", "status", "withdrawnAt", "yearLevel" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FileAttachment_uploadedById_createdAt_idx" ON "FileAttachment"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "Announcement_classId_createdAt_idx" ON "Announcement"("classId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TutorResource_fileId_key" ON "TutorResource"("fileId");

-- CreateIndex
CREATE INDEX "TutorResource_subject_yearLevel_idx" ON "TutorResource"("subject", "yearLevel");

-- CreateIndex
CREATE INDEX "TutorResource_classId_idx" ON "TutorResource"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCourseOutline_fileId_key" ON "StudentCourseOutline"("fileId");

-- CreateIndex
CREATE INDEX "StudentCourseOutline_studentId_uploadedAt_idx" ON "StudentCourseOutline"("studentId", "uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolDocument_fileId_key" ON "SchoolDocument"("fileId");

-- CreateIndex
CREATE INDEX "SchoolDocument_studentId_uploadedAt_idx" ON "SchoolDocument"("studentId", "uploadedAt");

-- CreateIndex
CREATE INDEX "StudentAssessment_studentId_dueDate_idx" ON "StudentAssessment"("studentId", "dueDate");

-- CreateIndex
CREATE INDEX "Question_classId_status_createdAt_idx" ON "Question"("classId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Question_studentId_createdAt_idx" ON "Question"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionReply_questionId_createdAt_idx" ON "QuestionReply"("questionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionReaction_questionId_studentId_key" ON "QuestionReaction"("questionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAttachment_fileId_key" ON "QuestionAttachment"("fileId");

-- CreateIndex
CREATE INDEX "QuestionAttachment_questionId_idx" ON "QuestionAttachment"("questionId");
