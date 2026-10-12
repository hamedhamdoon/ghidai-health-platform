BEGIN; CREATE EXTENSION IF NOT EXISTS btree_gist; SET ROLE ghidai_owner;

CREATE TYPE "Role" AS ENUM ('USER','COACH','ADMIN');

CREATE TYPE "UserStatus" AS ENUM ('PENDING','ACTIVE','SUSPENDED','DELETION_PENDING','DELETED');

CREATE TYPE "ConsentKind" AS ENUM ('PRIVACY','NOTIFICATIONS','COACH');

CREATE TYPE "GrantAction" AS ENUM ('READ','NOTE');

CREATE TYPE "ContentStatus" AS ENUM ('DRAFT','IN_REVIEW','APPROVED','REJECTED','WITHDRAWN');

CREATE TYPE "ProgramStatus" AS ENUM ('ACTIVE','PAUSED','ARCHIVED');

CREATE TYPE "VersionStatus" AS ENUM ('DRAFT','IN_REVIEW','PUBLISHED','WITHDRAWN');

CREATE TYPE "Metric" AS ENUM ('WATER_ML','STEPS','EXERCISE_MIN','SLEEP_MIN');

CREATE TYPE "TaskType" AS ENUM ('MEAL','WATER','STEPS','EXERCISE','SLEEP','HABIT','MANUAL');

CREATE TYPE "CompletionMode" AS ENUM ('MANUAL','DERIVED');

CREATE TYPE "RecordKind" AS ENUM ('WATER','STEPS','EXERCISE','SLEEP','REVIEW');

CREATE TYPE "JobStatus" AS ENUM ('PENDING','RUNNING','DONE','FAILED','CANCELLED');

CREATE TABLE "User" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "emailNormalized" varchar(254) UNIQUE, "passwordHash" text, role "Role" NOT NULL, status "UserStatus" NOT NULL DEFAULT 'PENDING', "verifiedAt" timestamptz, CHECK(true));

CREATE TABLE "Profile" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "displayName" varchar(80) NOT NULL, timezone varchar(64) NOT NULL, locale varchar(10) NOT NULL, "cupMl" integer CHECK("cupMl">0), UNIQUE("userId"), UNIQUE("userId",id));

CREATE TABLE "Session" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "tokenHash" text NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL, "lastSeenAt" timestamptz NOT NULL, "revokedAt" timestamptz, "reauthenticatedAt" timestamptz, "mfaVerifiedAt" timestamptz, UNIQUE("userId",id));

CREATE TABLE "AuthToken" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, kind text NOT NULL CHECK(kind IN ('VERIFY','RESET')), "tokenHash" text NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL, "usedAt" timestamptz, UNIQUE("userId",id));

CREATE TABLE "MfaCredential" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "secretEncrypted" bytea NOT NULL, "enabledAt" timestamptz, "recoveryHashes" jsonb NOT NULL, UNIQUE("userId"), UNIQUE("userId",id));

CREATE TABLE "Consent" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, kind "ConsentKind" NOT NULL, "policyVersion" text NOT NULL, "scopeKey" text NOT NULL, scope jsonb NOT NULL, "grantedAt" timestamptz NOT NULL, "expiresAt" timestamptz NOT NULL, "revokedAt" timestamptz, CHECK("expiresAt">"grantedAt"), UNIQUE("userId",id));

CREATE TABLE "CoachAssignment" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "coachId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "consentId" uuid NOT NULL, "startsAt" timestamptz NOT NULL, "expiresAt" timestamptz NOT NULL, "revokedAt" timestamptz, CHECK("coachId"<>"userId"), CHECK("expiresAt">"startsAt"), FOREIGN KEY ("userId","consentId") REFERENCES "Consent" ("userId","id") ON DELETE RESTRICT, UNIQUE(id,"userId","coachId","consentId"), UNIQUE("userId",id));

CREATE TABLE "AccessGrant" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "subjectId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "scopeUserId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, resource text NOT NULL CHECK(resource IN ('WaterLog','StepDayLog','ExerciseLog','SleepLog','DailyReview','CoachNote')), action "GrantAction" NOT NULL, "assignmentId" uuid NOT NULL, "consentId" uuid NOT NULL, "startsAt" timestamptz NOT NULL, "expiresAt" timestamptz NOT NULL, "revokedAt" timestamptz, reason varchar(500) NOT NULL, "grantedBy" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, FOREIGN KEY ("assignmentId","scopeUserId","subjectId","consentId") REFERENCES "CoachAssignment" ("id","userId","coachId","consentId") ON DELETE RESTRICT, CHECK("expiresAt">"startsAt"));

CREATE TABLE "ReviewerQualification" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "reviewerId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, scope text NOT NULL, "evidenceReference" text NOT NULL, "verifiedBy" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "validUntil" timestamptz NOT NULL, status text NOT NULL CHECK(status IN ('ACTIVE','REVOKED')), CHECK("reviewerId"<>"verifiedBy"), UNIQUE(id,"reviewerId"));

CREATE TABLE "UserGoal" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, metric "Metric" NOT NULL, value numeric(12,2) NOT NULL CHECK(value>0), "effectiveDate" date NOT NULL, "endDate" date, UNIQUE("userId",metric,"effectiveDate"), CHECK("endDate" IS NULL OR "endDate">="effectiveDate"), EXCLUDE USING gist ("userId" WITH =, metric WITH =, daterange("effectiveDate","endDate",'[]') WITH &&), UNIQUE("userId",id));

CREATE TABLE "SourceImage" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "sourceKey" text NOT NULL UNIQUE, path text NOT NULL UNIQUE, sha256 char(64) NOT NULL, "rightsStatus" text NOT NULL CHECK("rightsStatus" IN ('UNKNOWN','APPROVED')), CHECK(true));

CREATE TABLE "SourceExtract" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "imageId" uuid NOT NULL REFERENCES "SourceImage"(id) ON DELETE RESTRICT, "extractKey" text NOT NULL, "originalText" text NOT NULL, section text NOT NULL, confidence text NOT NULL CHECK(confidence IN ('HIGH','MEDIUM','LOW')), "requiresReview" boolean NOT NULL, UNIQUE("imageId","extractKey"));

CREATE TABLE "SourceConflict" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "conflictKey" text NOT NULL UNIQUE, description text NOT NULL, resolution text, "resolvedBy" uuid REFERENCES "User"(id), CHECK(true));

CREATE TABLE "ConflictExtract" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "conflictId" uuid NOT NULL REFERENCES "SourceConflict"(id) ON DELETE RESTRICT, "extractId" uuid NOT NULL REFERENCES "SourceExtract"(id) ON DELETE RESTRICT, UNIQUE("conflictId","extractId"));

CREATE TABLE "ContentRevision" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "contentKey" text NOT NULL, version integer NOT NULL CHECK(version>0), kind text NOT NULL CHECK(kind IN ('MEAL','GUIDANCE','MOTIVATION','CLAIM')), title text NOT NULL, "bodyText" text NOT NULL, "contentHash" char(64) NOT NULL, status "ContentStatus" NOT NULL DEFAULT 'DRAFT', "authorId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "previousRevisionId" uuid REFERENCES "ContentRevision"(id), UNIQUE("contentKey",version), UNIQUE("contentKey",id));

CREATE TABLE "ContentSource" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "revisionId" uuid NOT NULL REFERENCES "ContentRevision"(id) ON DELETE RESTRICT, "extractId" uuid NOT NULL REFERENCES "SourceExtract"(id) ON DELETE RESTRICT, UNIQUE("revisionId","extractId"));

CREATE TABLE "ContentReview" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "revisionId" uuid NOT NULL REFERENCES "ContentRevision"(id) ON DELETE RESTRICT, "reviewerId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "qualificationId" uuid NOT NULL, decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED')), rationale text NOT NULL, "decidedAt" timestamptz NOT NULL, "reviewedHash" char(64) NOT NULL, FOREIGN KEY ("qualificationId","reviewerId") REFERENCES "ReviewerQualification" ("id","reviewerId") ON DELETE RESTRICT);

CREATE TABLE "ContentWithdrawal" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "revisionId" uuid NOT NULL REFERENCES "ContentRevision"(id) ON DELETE RESTRICT UNIQUE, "authorizedBy" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, reason text NOT NULL, "effectiveAt" timestamptz NOT NULL, CHECK(true));

CREATE TABLE "PolicyVersion" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), version integer NOT NULL UNIQUE, "lateWindowDays" integer NOT NULL CHECK("lateWindowDays" BETWEEN 0 AND 7), "dayBoundary" time NOT NULL, "streakRule" jsonb NOT NULL, "certificateThreshold" numeric(5,2) NOT NULL CHECK("certificateThreshold" BETWEEN 0 AND 100), CHECK(true));

CREATE TABLE "ReviewSchemaVersion" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), version integer NOT NULL, name text NOT NULL, status "VersionStatus" NOT NULL DEFAULT 'DRAFT', UNIQUE(name,version));

CREATE TABLE "ReviewDimension" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "schemaId" uuid NOT NULL REFERENCES "ReviewSchemaVersion"(id) ON DELETE RESTRICT, key text NOT NULL CHECK(key IN ('COMMITMENT','ENERGY','HUNGER','MOOD','GENERAL')), label text NOT NULL, "order" integer NOT NULL, UNIQUE("schemaId",key), UNIQUE("schemaId",id));

CREATE TABLE "ReviewOption" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "dimensionId" uuid NOT NULL REFERENCES "ReviewDimension"(id) ON DELETE RESTRICT, value integer NOT NULL, label text NOT NULL, UNIQUE("dimensionId",value), UNIQUE("dimensionId",id));

CREATE TABLE "Program" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), slug text NOT NULL UNIQUE, type text NOT NULL CHECK(type IN ('LIFESTYLE','WALKING','CUSTOM')), status "ProgramStatus" NOT NULL DEFAULT 'ACTIVE', "ownerId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, CHECK(true));

CREATE TABLE "ProgramVersion" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "programId" uuid NOT NULL REFERENCES "Program"(id) ON DELETE RESTRICT, version integer NOT NULL CHECK(version>0), title text NOT NULL, "descriptionRevisionId" uuid NOT NULL REFERENCES "ContentRevision"(id) ON DELETE RESTRICT, "durationDays" integer NOT NULL CHECK("durationDays" BETWEEN 1 AND 366), "startMode" text NOT NULL CHECK("startMode" IN ('FLEXIBLE','FIXED')), "fixedStartDate" date, "reviewSchemaVersionId" uuid NOT NULL REFERENCES "ReviewSchemaVersion"(id) ON DELETE RESTRICT, "policyVersionId" uuid NOT NULL REFERENCES "PolicyVersion"(id) ON DELETE RESTRICT, status "VersionStatus" NOT NULL DEFAULT 'DRAFT', "publishedAt" timestamptz, UNIQUE("programId",version), UNIQUE("programId",id,"policyVersionId"), CHECK(("startMode"='FIXED')=("fixedStartDate" IS NOT NULL)));

CREATE TABLE "ProgramWithdrawal" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "versionId" uuid NOT NULL REFERENCES "ProgramVersion"(id) ON DELETE RESTRICT UNIQUE, "authorizedBy" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, reason text NOT NULL, safety boolean NOT NULL, "effectiveAt" timestamptz NOT NULL, CHECK(true));

CREATE TABLE "ProgramDay" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "versionId" uuid NOT NULL REFERENCES "ProgramVersion"(id) ON DELETE RESTRICT, "dayIndex" integer NOT NULL CHECK("dayIndex">0), label text, UNIQUE("versionId","dayIndex"), UNIQUE("versionId",id));

CREATE TABLE "NutritionPlan" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "contentRevisionId" uuid NOT NULL REFERENCES "ContentRevision"(id) ON DELETE RESTRICT, label text NOT NULL, CHECK(true));

CREATE TABLE "Meal" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "contentRevisionId" uuid NOT NULL REFERENCES "ContentRevision"(id) ON DELETE RESTRICT UNIQUE, slot text NOT NULL CHECK(slot IN ('BREAKFAST','LUNCH','DINNER','SNACK','OTHER')), CHECK(true));

CREATE TABLE "Ingredient" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), name text NOT NULL, "unitFamily" text NOT NULL CHECK("unitFamily" IN ('MASS','VOLUME','COUNT')), "metadataRevisionId" uuid REFERENCES "ContentRevision"(id), CHECK(true));

CREATE TABLE "MealIngredient" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "mealId" uuid NOT NULL REFERENCES "Meal"(id) ON DELETE RESTRICT, "ingredientId" uuid NOT NULL REFERENCES "Ingredient"(id) ON DELETE RESTRICT, quantity numeric(10,2) NOT NULL CHECK(quantity>0), unit text NOT NULL CHECK(unit IN ('G','ML','PIECE','SPOON','HANDFUL')), "measurementBasis" text NOT NULL CHECK("measurementBasis" IN ('RAW','COOKED','UNSPECIFIED')), preparation text, "conversionFactor" numeric(12,4) CHECK("conversionFactor">0), CHECK(true));

CREATE TABLE "PlanMeal" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "planId" uuid NOT NULL REFERENCES "NutritionPlan"(id) ON DELETE RESTRICT, "dayIndex" integer NOT NULL CHECK("dayIndex">0), slot text NOT NULL, "order" integer NOT NULL, "mealRevisionId" uuid NOT NULL REFERENCES "ContentRevision"(id) ON DELETE RESTRICT, UNIQUE("planId","dayIndex",slot,"order"));

CREATE TABLE "MealAlternative" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "planMealId" uuid NOT NULL REFERENCES "PlanMeal"(id) ON DELETE RESTRICT, "alternativeMealId" uuid NOT NULL REFERENCES "Meal"(id) ON DELETE RESTRICT, "order" integer NOT NULL, "approvalRevisionId" uuid NOT NULL REFERENCES "ContentRevision"(id) ON DELETE RESTRICT, UNIQUE("planMealId","alternativeMealId"));

CREATE TABLE "ProgramNutritionPlan" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "versionId" uuid NOT NULL REFERENCES "ProgramVersion"(id) ON DELETE RESTRICT, "planId" uuid NOT NULL REFERENCES "NutritionPlan"(id) ON DELETE RESTRICT, UNIQUE("versionId","planId"));

CREATE TABLE "TaskDefinition" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "versionId" uuid NOT NULL REFERENCES "ProgramVersion"(id) ON DELETE RESTRICT, "programDayId" uuid NOT NULL, key text NOT NULL, "titleRevisionId" uuid NOT NULL REFERENCES "ContentRevision"(id) ON DELETE RESTRICT, type "TaskType" NOT NULL, required boolean NOT NULL, "order" integer NOT NULL, "scheduleKind" text NOT NULL CHECK("scheduleKind" IN ('NONE','AT','WINDOW','RELATIVE')), "timeStart" time, "timeEnd" time, "anchorTaskId" uuid, "offsetMin" integer, "completionMode" text NOT NULL CHECK("completionMode" IN ('MANUAL','THRESHOLD')), metric "Metric", "defaultTarget" numeric(12,2) CHECK("defaultTarget">0), "planMealId" uuid REFERENCES "PlanMeal"(id), FOREIGN KEY ("versionId","programDayId") REFERENCES "ProgramDay" ("versionId","id") ON DELETE RESTRICT, UNIQUE("programDayId",key), UNIQUE("programDayId","order"), UNIQUE("versionId",id), UNIQUE("programDayId",id), FOREIGN KEY ("programDayId","anchorTaskId") REFERENCES "TaskDefinition" ("programDayId","id") ON DELETE RESTRICT, CHECK(("completionMode"='THRESHOLD')=(metric IS NOT NULL AND "defaultTarget" IS NOT NULL)), CHECK(("scheduleKind"='NONE' AND "timeStart" IS NULL AND "timeEnd" IS NULL AND "anchorTaskId" IS NULL AND "offsetMin" IS NULL) OR ("scheduleKind"='AT' AND "timeStart" IS NOT NULL AND "timeEnd" IS NULL AND "anchorTaskId" IS NULL AND "offsetMin" IS NULL) OR ("scheduleKind"='WINDOW' AND "timeStart" IS NOT NULL AND "timeEnd">"timeStart" AND "anchorTaskId" IS NULL AND "offsetMin" IS NULL) OR ("scheduleKind"='RELATIVE' AND "timeStart" IS NULL AND "timeEnd" IS NULL AND "anchorTaskId" IS NOT NULL AND "offsetMin" IS NOT NULL)));

CREATE TABLE "RecurrenceDefinition" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "versionId" uuid NOT NULL REFERENCES "ProgramVersion"(id) ON DELETE RESTRICT, "taskTemplate" jsonb NOT NULL, "dayIndices" integer[] NOT NULL, pattern text NOT NULL CHECK(pattern IN ('EXPLICIT','EVERY_DAY','WEEKDAYS')), "order" integer NOT NULL, CHECK(true));

CREATE TABLE "Enrollment" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "programId" uuid NOT NULL, "versionId" uuid NOT NULL, "policyVersionId" uuid NOT NULL, "startDate" date NOT NULL, "timezoneSnapshot" varchar(64) NOT NULL, status text NOT NULL CHECK(status IN ('SCHEDULED','ACTIVE','COMPLETED','WITHDRAWN')), "withdrawnAt" timestamptz, FOREIGN KEY ("programId","versionId","policyVersionId") REFERENCES "ProgramVersion" ("programId","id","policyVersionId") ON DELETE RESTRICT, UNIQUE("userId",id,"versionId"), UNIQUE("userId",id));

CREATE TABLE "EnrollmentDay" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "enrollmentId" uuid NOT NULL, "versionId" uuid NOT NULL, "localDate" date NOT NULL, "dayIndex" integer NOT NULL, state text NOT NULL CHECK(state IN ('OPEN','LOCKED','EXCLUDED')), "exclusionReason" text, FOREIGN KEY ("userId","enrollmentId","versionId") REFERENCES "Enrollment" ("userId","id","versionId") ON DELETE RESTRICT, FOREIGN KEY ("versionId","dayIndex") REFERENCES "ProgramDay" ("versionId","dayIndex") ON DELETE RESTRICT, UNIQUE("enrollmentId","dayIndex"), UNIQUE("enrollmentId","localDate"), UNIQUE("userId",id,"versionId"), UNIQUE("userId",id));

CREATE TABLE "TaskOccurrence" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "dayId" uuid NOT NULL, "versionId" uuid NOT NULL, "definitionId" uuid NOT NULL, "scheduledAt" timestamptz, "dueAt" timestamptz, "requiredSnapshot" boolean NOT NULL, "targetSnapshot" numeric(12,2) CHECK("targetSnapshot">0), metric "Metric", "orderSnapshot" integer NOT NULL, FOREIGN KEY ("userId","dayId","versionId") REFERENCES "EnrollmentDay" ("userId","id","versionId") ON DELETE RESTRICT, FOREIGN KEY ("versionId","definitionId") REFERENCES "TaskDefinition" ("versionId","id") ON DELETE RESTRICT, UNIQUE("dayId","definitionId"), UNIQUE("userId",id));

CREATE TABLE "TaskCompletion" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "occurrenceId" uuid NOT NULL UNIQUE, "completedAt" timestamptz NOT NULL, "recordedAt" timestamptz NOT NULL, "isLate" boolean NOT NULL, mode "CompletionMode" NOT NULL, "evidenceRevision" integer NOT NULL, FOREIGN KEY ("userId","occurrenceId") REFERENCES "TaskOccurrence" ("userId","id") ON DELETE RESTRICT, UNIQUE("userId",id));

CREATE TABLE "TaskExclusion" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "occurrenceId" uuid NOT NULL UNIQUE, reason text NOT NULL, "authorizedBy" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "effectiveAt" timestamptz NOT NULL, "sourceWithdrawalId" uuid NOT NULL REFERENCES "ProgramWithdrawal"(id) ON DELETE RESTRICT, FOREIGN KEY ("userId","occurrenceId") REFERENCES "TaskOccurrence" ("userId","id") ON DELETE RESTRICT, UNIQUE("userId",id));

CREATE TABLE "MealSelection" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "occurrenceId" uuid NOT NULL UNIQUE, "planMealId" uuid NOT NULL, "alternativeMealId" uuid, FOREIGN KEY ("userId","occurrenceId") REFERENCES "TaskOccurrence" ("userId","id") ON DELETE RESTRICT, FOREIGN KEY ("planMealId","alternativeMealId") REFERENCES "MealAlternative" ("planMealId","alternativeMealId") ON DELETE RESTRICT, UNIQUE("userId",id));

CREATE TABLE "HealthRecord" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, kind "RecordKind" NOT NULL, UNIQUE("userId",id,kind), UNIQUE("userId",id));

CREATE TABLE "WaterLog" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "recordId" uuid NOT NULL UNIQUE, "recordKind" "RecordKind" NOT NULL DEFAULT 'WATER' CHECK("recordKind"='WATER'), "occurredAt" timestamptz NOT NULL, "recordedAt" timestamptz NOT NULL, "localDate" date NOT NULL, "timezoneSnapshot" varchar(64) NOT NULL, "amountMl" integer NOT NULL CHECK("amountMl" BETWEEN 1 AND 5000), "inputUnit" text NOT NULL CHECK("inputUnit" IN ('ML','CUP')), "cupMlSnapshot" integer, "deletedAt" timestamptz, FOREIGN KEY ("userId","recordId","recordKind") REFERENCES "HealthRecord" ("userId","id","kind") ON DELETE RESTRICT, CHECK(("inputUnit"='ML' AND "cupMlSnapshot" IS NULL) OR ("inputUnit"='CUP' AND "cupMlSnapshot" BETWEEN 1 AND 2000)), UNIQUE("userId",id));

CREATE TABLE "StepDayLog" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "recordId" uuid NOT NULL UNIQUE, "recordKind" "RecordKind" NOT NULL DEFAULT 'STEPS' CHECK("recordKind"='STEPS'), "localDate" date NOT NULL, "timezoneSnapshot" varchar(64) NOT NULL, "totalSteps" integer NOT NULL CHECK("totalSteps" BETWEEN 0 AND 200000), "recordedAt" timestamptz NOT NULL, source text NOT NULL CHECK(source='MANUAL'), "deletedAt" timestamptz, FOREIGN KEY ("userId","recordId","recordKind") REFERENCES "HealthRecord" ("userId","id","kind") ON DELETE RESTRICT, UNIQUE("userId","localDate"), UNIQUE("userId",id));

CREATE TABLE "ExerciseLog" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "recordId" uuid NOT NULL UNIQUE, "recordKind" "RecordKind" NOT NULL DEFAULT 'EXERCISE' CHECK("recordKind"='EXERCISE'), type text NOT NULL CHECK(type IN ('WALK','RUN','STRENGTH','OTHER')), "startsAt" timestamptz NOT NULL, "durationMin" integer NOT NULL CHECK("durationMin" BETWEEN 1 AND 1440), "localDate" date NOT NULL, note varchar(2000), "deletedAt" timestamptz, FOREIGN KEY ("userId","recordId","recordKind") REFERENCES "HealthRecord" ("userId","id","kind") ON DELETE RESTRICT, UNIQUE("userId",id));

CREATE TABLE "SleepLog" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "recordId" uuid NOT NULL UNIQUE, "recordKind" "RecordKind" NOT NULL DEFAULT 'SLEEP' CHECK("recordKind"='SLEEP'), "startsAt" timestamptz NOT NULL, "endsAt" timestamptz NOT NULL, "wakeDate" date NOT NULL, "timezoneSnapshot" varchar(64) NOT NULL, "deletedAt" timestamptz, FOREIGN KEY ("userId","recordId","recordKind") REFERENCES "HealthRecord" ("userId","id","kind") ON DELETE RESTRICT, CHECK("endsAt">"startsAt" AND "endsAt"-"startsAt"<=interval '24 hours'), EXCLUDE USING gist ("userId" WITH =, tstzrange("startsAt","endsAt",'[)') WITH &&) WHERE ("deletedAt" IS NULL), UNIQUE("userId",id));

CREATE TABLE "HabitDefinition" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, title varchar(120) NOT NULL, recurrence jsonb NOT NULL, "startsDate" date NOT NULL, "endsDate" date, "archivedAt" timestamptz, CHECK("endsDate" IS NULL OR "endsDate">="startsDate"), UNIQUE("userId",id));

CREATE TABLE "HabitLog" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "habitId" uuid NOT NULL, "localDate" date NOT NULL, "completedAt" timestamptz NOT NULL, FOREIGN KEY ("userId","habitId") REFERENCES "HabitDefinition" ("userId","id") ON DELETE RESTRICT, UNIQUE("habitId","localDate"), UNIQUE("userId",id));

CREATE TABLE "DailyReview" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "recordId" uuid NOT NULL UNIQUE, "recordKind" "RecordKind" NOT NULL DEFAULT 'REVIEW' CHECK("recordKind"='REVIEW'), "localDate" date NOT NULL, "schemaVersionId" uuid NOT NULL REFERENCES "ReviewSchemaVersion"(id) ON DELETE RESTRICT, notes varchar(2000), "weightKg" numeric(5,2) CHECK("weightKg">0 AND "weightKg"<=500), "recordedAt" timestamptz NOT NULL, FOREIGN KEY ("userId","recordId","recordKind") REFERENCES "HealthRecord" ("userId","id","kind") ON DELETE RESTRICT, UNIQUE("userId","localDate"), UNIQUE("userId",id,"schemaVersionId"), UNIQUE("userId",id));

CREATE TABLE "ReviewAnswer" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "reviewId" uuid NOT NULL, "schemaVersionId" uuid NOT NULL, "dimensionId" uuid NOT NULL, "optionId" uuid NOT NULL, FOREIGN KEY ("userId","reviewId","schemaVersionId") REFERENCES "DailyReview" ("userId","id","schemaVersionId") ON DELETE RESTRICT, FOREIGN KEY ("schemaVersionId","dimensionId") REFERENCES "ReviewDimension" ("schemaId","id") ON DELETE RESTRICT, FOREIGN KEY ("dimensionId","optionId") REFERENCES "ReviewOption" ("dimensionId","id") ON DELETE RESTRICT, UNIQUE("reviewId","dimensionId"), UNIQUE("userId",id));

CREATE TABLE "CorrectionRequest" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "recordId" uuid NOT NULL, "proposedPatchEncrypted" bytea NOT NULL, reason varchar(500) NOT NULL, status text NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED','CANCELLED')), "reviewedBy" uuid REFERENCES "User"(id), "reviewedAt" timestamptz, FOREIGN KEY ("userId","recordId") REFERENCES "HealthRecord" ("userId","id") ON DELETE RESTRICT, UNIQUE("userId",id));

CREATE TABLE "LogRevision" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "recordId" uuid NOT NULL, "recordRevision" integer NOT NULL CHECK("recordRevision">0), "beforeEncrypted" bytea, "afterEncrypted" bytea, cause text NOT NULL, "recordedAt" timestamptz NOT NULL, FOREIGN KEY ("userId","recordId") REFERENCES "HealthRecord" ("userId","id") ON DELETE RESTRICT, UNIQUE("recordId","recordRevision"), UNIQUE("userId",id));

CREATE TABLE "CoachNote" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "coachId" uuid NOT NULL, "assignmentId" uuid NOT NULL, "consentId" uuid NOT NULL, text varchar(2000) NOT NULL, FOREIGN KEY ("assignmentId","userId","coachId","consentId") REFERENCES "CoachAssignment" ("id","userId","coachId","consentId") ON DELETE RESTRICT, UNIQUE("userId",id));

CREATE TABLE "AchievementRuleVersion" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), code text NOT NULL, version integer NOT NULL, type text NOT NULL CHECK(type IN ('FIRST_DAY','STREAK','COMPLETION')), config jsonb NOT NULL, "contentRevisionId" uuid NOT NULL REFERENCES "ContentRevision"(id) ON DELETE RESTRICT, status "VersionStatus" NOT NULL DEFAULT 'DRAFT', UNIQUE(code,version));

CREATE TABLE "ProgramAchievementRule" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "versionId" uuid NOT NULL REFERENCES "ProgramVersion"(id) ON DELETE RESTRICT, "ruleVersionId" uuid NOT NULL REFERENCES "AchievementRuleVersion"(id) ON DELETE RESTRICT, UNIQUE("versionId","ruleVersionId"));

CREATE TABLE "AchievementAward" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "enrollmentId" uuid NOT NULL, "ruleVersionId" uuid NOT NULL REFERENCES "AchievementRuleVersion"(id) ON DELETE RESTRICT, status text NOT NULL CHECK(status IN ('GRANTED','REVOKED')), "grantedAt" timestamptz NOT NULL, "revokedAt" timestamptz, evidence jsonb NOT NULL, "aggregateRevision" integer NOT NULL, FOREIGN KEY ("userId","enrollmentId") REFERENCES "Enrollment" ("userId","id") ON DELETE RESTRICT, UNIQUE("userId","enrollmentId","ruleVersionId"), UNIQUE("userId",id));

CREATE TABLE "Certificate" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "awardId" uuid NOT NULL UNIQUE, serial text NOT NULL UNIQUE, "issuedAt" timestamptz NOT NULL, status text NOT NULL CHECK(status IN ('VALID','REVOKED')), FOREIGN KEY ("userId","awardId") REFERENCES "AchievementAward" ("userId","id") ON DELETE RESTRICT, UNIQUE("userId",id));

CREATE TABLE "NotificationPreference" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "enabledInApp" boolean NOT NULL, "enabledPush" boolean NOT NULL, "quietStart" time, "quietEnd" time, timezone varchar(64) NOT NULL, "consentId" uuid, UNIQUE("userId"), FOREIGN KEY ("userId","consentId") REFERENCES "Consent" ("userId","id") ON DELETE RESTRICT, CHECK(NOT "enabledPush" OR "consentId" IS NOT NULL), UNIQUE("userId",id));

CREATE TABLE "ReminderRule" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "enrollmentId" uuid, "taskDefinitionId" uuid REFERENCES "TaskDefinition"(id), "localTime" time NOT NULL, channel text NOT NULL CHECK(channel IN ('IN_APP','PUSH')), enabled boolean NOT NULL, FOREIGN KEY ("userId","enrollmentId") REFERENCES "Enrollment" ("userId","id") ON DELETE RESTRICT, UNIQUE("userId",id));

CREATE TABLE "PushSubscription" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "endpointHash" text NOT NULL UNIQUE, "endpointEncrypted" bytea NOT NULL, "keysEncrypted" bytea NOT NULL, "revokedAt" timestamptz, UNIQUE("userId",id));

CREATE TABLE "Notification" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, type text NOT NULL, "safeTitle" varchar(120) NOT NULL, "safeBody" varchar(500) NOT NULL, "targetKind" text NOT NULL, "targetId" uuid, "readAt" timestamptz, "dedupeKey" text NOT NULL, UNIQUE("userId","dedupeKey"), UNIQUE("userId",id));

CREATE TABLE "OutboxJob" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, kind text NOT NULL CHECK(kind IN ('EMAIL','PUSH','EXPORT','DELETE','RECALCULATE')), "payloadEncrypted" bytea NOT NULL, "dueAt" timestamptz NOT NULL, "leaseUntil" timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0), status "JobStatus" NOT NULL DEFAULT 'PENDING', "dedupeKey" text NOT NULL UNIQUE, "lastErrorCode" text, UNIQUE("userId",id));

CREATE TABLE "IdempotencyRecord" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, action text NOT NULL, key uuid NOT NULL, "requestHash" char(64) NOT NULL, "responseEncrypted" bytea NOT NULL, "expiresAt" timestamptz NOT NULL, UNIQUE("userId",action,key), UNIQUE("userId",id));

CREATE TABLE "RateLimitBucket" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "keyHash" text NOT NULL, "window" timestamptz NOT NULL, count integer NOT NULL CHECK(count>=0), "expiresAt" timestamptz NOT NULL, UNIQUE("keyHash","window"));

CREATE TABLE "AuditLog" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "actorId" uuid REFERENCES "User"(id), action text NOT NULL, "targetType" text NOT NULL, "targetId" uuid, "requestId" uuid NOT NULL, "occurredAt" timestamptz NOT NULL, reason varchar(500), "safeMetadata" jsonb NOT NULL DEFAULT '{}', CHECK(true));

CREATE TABLE "PrivacyRequest" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, kind text NOT NULL CHECK(kind IN ('EXPORT','DELETE')), status "JobStatus" NOT NULL, "requestedAt" timestamptz NOT NULL, "completedAt" timestamptz, "expiresAt" timestamptz, "resultLocationEncrypted" bytea, UNIQUE("userId",id));

CREATE TABLE "DeletionLedger" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), "subjectKeyHash" text NOT NULL UNIQUE, "completedAt" timestamptz NOT NULL, "retainUntil" timestamptz NOT NULL, "backupCutoff" timestamptz NOT NULL, CHECK(true));

CREATE TABLE "OperationsReport" (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1 CHECK(revision>0), kind text NOT NULL CHECK(kind IN ('BACKUP','RESTORE','RESOURCE','INCIDENT')), "safeMetadata" jsonb NOT NULL, "performedBy" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, "occurredAt" timestamptz NOT NULL, CHECK(true));

CREATE UNIQUE INDEX consent_active ON "Consent"("userId",kind,"scopeKey") WHERE "revokedAt" IS NULL;
CREATE UNIQUE INDEX enrollment_active ON "Enrollment"("userId","programId") WHERE status IN ('ACTIVE','SCHEDULED');
CREATE UNIQUE INDEX privacy_active ON "PrivacyRequest"("userId",kind) WHERE status IN ('PENDING','RUNNING');
CREATE INDEX outbox_claim ON "OutboxJob"(status,"dueAt");

DO $$ DECLARE r record; BEGIN FOR r IN SELECT c.conrelid::regclass AS tbl,c.conname,a.attname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] WHERE c.contype='f' AND c.connamespace=current_schema()::regnamespace LOOP EXECUTE format('CREATE INDEX %I ON %s (%I)',r.conname||'_idx',r.tbl,r.attname); END LOOP; END $$;

CREATE FUNCTION actor_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id',true),'')::uuid $$;
CREATE FUNCTION active_actor() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ SELECT EXISTS(SELECT 1 FROM "User" WHERE id=actor_id() AND status='ACTIVE') $$;
CREATE FUNCTION can_read(subject uuid, resource_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
SELECT EXISTS (SELECT 1 FROM "User" u JOIN "AccessGrant" g ON g."subjectId"=u.id JOIN "CoachAssignment" a ON a.id=g."assignmentId" JOIN "Consent" c ON c.id=g."consentId" WHERE u.id=actor_id() AND u.role='COACH' AND u.status='ACTIVE' AND g."scopeUserId"=subject AND g.resource=resource_name AND g.action='READ' AND g."revokedAt" IS NULL AND now()>=g."startsAt" AND now()<g."expiresAt" AND a."revokedAt" IS NULL AND now()>=a."startsAt" AND now()<a."expiresAt" AND c.kind='COACH' AND c."revokedAt" IS NULL AND now()>=c."grantedAt" AND now()<c."expiresAt") $$;

RESET ROLE; GRANT SELECT ON "User","AccessGrant","CoachAssignment","Consent" TO ghidai_policy; ALTER FUNCTION active_actor() OWNER TO ghidai_policy; ALTER FUNCTION can_read(uuid,text) OWNER TO ghidai_policy; SET ROLE ghidai_owner;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY; ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Profile" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "Profile" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "Profile" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "Profile" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Session" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "Session" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "AuthToken" ENABLE ROW LEVEL SECURITY; ALTER TABLE "AuthToken" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "AuthToken" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "MfaCredential" ENABLE ROW LEVEL SECURITY; ALTER TABLE "MfaCredential" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "MfaCredential" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "Consent" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Consent" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "Consent" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "CoachAssignment" ENABLE ROW LEVEL SECURITY; ALTER TABLE "CoachAssignment" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "CoachAssignment" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "AccessGrant" ENABLE ROW LEVEL SECURITY; ALTER TABLE "AccessGrant" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ReviewerQualification" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ReviewerQualification" FORCE ROW LEVEL SECURITY;

ALTER TABLE "UserGoal" ENABLE ROW LEVEL SECURITY; ALTER TABLE "UserGoal" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "UserGoal" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "UserGoal" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "UserGoal" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "SourceImage" ENABLE ROW LEVEL SECURITY; ALTER TABLE "SourceImage" FORCE ROW LEVEL SECURITY;

ALTER TABLE "SourceExtract" ENABLE ROW LEVEL SECURITY; ALTER TABLE "SourceExtract" FORCE ROW LEVEL SECURITY;

ALTER TABLE "SourceConflict" ENABLE ROW LEVEL SECURITY; ALTER TABLE "SourceConflict" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ConflictExtract" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ConflictExtract" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ContentRevision" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ContentRevision" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ContentSource" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ContentSource" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ContentReview" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ContentReview" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ContentWithdrawal" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ContentWithdrawal" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PolicyVersion" ENABLE ROW LEVEL SECURITY; ALTER TABLE "PolicyVersion" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ReviewSchemaVersion" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ReviewSchemaVersion" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ReviewDimension" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ReviewDimension" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ReviewOption" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ReviewOption" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Program" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Program" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ProgramVersion" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ProgramVersion" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ProgramWithdrawal" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ProgramWithdrawal" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ProgramDay" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ProgramDay" FORCE ROW LEVEL SECURITY;

ALTER TABLE "NutritionPlan" ENABLE ROW LEVEL SECURITY; ALTER TABLE "NutritionPlan" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Meal" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Meal" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Ingredient" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Ingredient" FORCE ROW LEVEL SECURITY;

ALTER TABLE "MealIngredient" ENABLE ROW LEVEL SECURITY; ALTER TABLE "MealIngredient" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PlanMeal" ENABLE ROW LEVEL SECURITY; ALTER TABLE "PlanMeal" FORCE ROW LEVEL SECURITY;

ALTER TABLE "MealAlternative" ENABLE ROW LEVEL SECURITY; ALTER TABLE "MealAlternative" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ProgramNutritionPlan" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ProgramNutritionPlan" FORCE ROW LEVEL SECURITY;

ALTER TABLE "TaskDefinition" ENABLE ROW LEVEL SECURITY; ALTER TABLE "TaskDefinition" FORCE ROW LEVEL SECURITY;

ALTER TABLE "RecurrenceDefinition" ENABLE ROW LEVEL SECURITY; ALTER TABLE "RecurrenceDefinition" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Enrollment" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "Enrollment" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "Enrollment" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "Enrollment" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "EnrollmentDay" ENABLE ROW LEVEL SECURITY; ALTER TABLE "EnrollmentDay" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "EnrollmentDay" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "TaskOccurrence" ENABLE ROW LEVEL SECURITY; ALTER TABLE "TaskOccurrence" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "TaskOccurrence" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "TaskCompletion" ENABLE ROW LEVEL SECURITY; ALTER TABLE "TaskCompletion" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "TaskCompletion" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "TaskCompletion" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "TaskCompletion" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "TaskExclusion" ENABLE ROW LEVEL SECURITY; ALTER TABLE "TaskExclusion" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "TaskExclusion" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "MealSelection" ENABLE ROW LEVEL SECURITY; ALTER TABLE "MealSelection" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "MealSelection" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "MealSelection" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "MealSelection" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "HealthRecord" ENABLE ROW LEVEL SECURITY; ALTER TABLE "HealthRecord" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "HealthRecord" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "HealthRecord" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "HealthRecord" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "WaterLog" ENABLE ROW LEVEL SECURITY; ALTER TABLE "WaterLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "WaterLog" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id() OR can_read("userId",'WaterLog')));

CREATE POLICY self_write ON "WaterLog" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "WaterLog" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "StepDayLog" ENABLE ROW LEVEL SECURITY; ALTER TABLE "StepDayLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "StepDayLog" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id() OR can_read("userId",'StepDayLog')));

CREATE POLICY self_write ON "StepDayLog" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "StepDayLog" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "ExerciseLog" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ExerciseLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "ExerciseLog" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id() OR can_read("userId",'ExerciseLog')));

CREATE POLICY self_write ON "ExerciseLog" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "ExerciseLog" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "SleepLog" ENABLE ROW LEVEL SECURITY; ALTER TABLE "SleepLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "SleepLog" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id() OR can_read("userId",'SleepLog')));

CREATE POLICY self_write ON "SleepLog" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "SleepLog" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "HabitDefinition" ENABLE ROW LEVEL SECURITY; ALTER TABLE "HabitDefinition" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "HabitDefinition" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "HabitDefinition" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "HabitDefinition" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "HabitLog" ENABLE ROW LEVEL SECURITY; ALTER TABLE "HabitLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "HabitLog" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "HabitLog" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "HabitLog" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "DailyReview" ENABLE ROW LEVEL SECURITY; ALTER TABLE "DailyReview" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "DailyReview" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id() OR can_read("userId",'DailyReview')));

CREATE POLICY self_write ON "DailyReview" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "DailyReview" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "ReviewAnswer" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ReviewAnswer" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "ReviewAnswer" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "ReviewAnswer" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "ReviewAnswer" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "CorrectionRequest" ENABLE ROW LEVEL SECURITY; ALTER TABLE "CorrectionRequest" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "CorrectionRequest" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "CorrectionRequest" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "CorrectionRequest" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "LogRevision" ENABLE ROW LEVEL SECURITY; ALTER TABLE "LogRevision" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "LogRevision" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "CoachNote" ENABLE ROW LEVEL SECURITY; ALTER TABLE "CoachNote" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "CoachNote" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id() OR can_read("userId",'CoachNote')));

ALTER TABLE "AchievementRuleVersion" ENABLE ROW LEVEL SECURITY; ALTER TABLE "AchievementRuleVersion" FORCE ROW LEVEL SECURITY;

ALTER TABLE "ProgramAchievementRule" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ProgramAchievementRule" FORCE ROW LEVEL SECURITY;

ALTER TABLE "AchievementAward" ENABLE ROW LEVEL SECURITY; ALTER TABLE "AchievementAward" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "AchievementAward" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "Certificate" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Certificate" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "Certificate" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY; ALTER TABLE "NotificationPreference" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "NotificationPreference" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "NotificationPreference" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "NotificationPreference" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "ReminderRule" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ReminderRule" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "ReminderRule" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "ReminderRule" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "ReminderRule" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY; ALTER TABLE "PushSubscription" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "PushSubscription" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "PushSubscription" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "PushSubscription" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "Notification" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "Notification" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "Notification" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "OutboxJob" ENABLE ROW LEVEL SECURITY; ALTER TABLE "OutboxJob" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "OutboxJob" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

ALTER TABLE "IdempotencyRecord" ENABLE ROW LEVEL SECURITY; ALTER TABLE "IdempotencyRecord" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "IdempotencyRecord" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "IdempotencyRecord" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "IdempotencyRecord" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY; ALTER TABLE "RateLimitBucket" FORCE ROW LEVEL SECURITY;

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY; ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PrivacyRequest" ENABLE ROW LEVEL SECURITY; ALTER TABLE "PrivacyRequest" FORCE ROW LEVEL SECURITY;

CREATE POLICY self_read ON "PrivacyRequest" FOR SELECT TO ghidai_app USING (active_actor() AND ("userId"=actor_id()));

CREATE POLICY self_write ON "PrivacyRequest" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id()); CREATE POLICY self_update ON "PrivacyRequest" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());

ALTER TABLE "DeletionLedger" ENABLE ROW LEVEL SECURITY; ALTER TABLE "DeletionLedger" FORCE ROW LEVEL SECURITY;

ALTER TABLE "OperationsReport" ENABLE ROW LEVEL SECURITY; ALTER TABLE "OperationsReport" FORCE ROW LEVEL SECURITY;

CREATE POLICY user_self ON "User" FOR SELECT TO ghidai_app USING(id=actor_id());
GRANT USAGE ON SCHEMA public TO ghidai_app,ghidai_policy;
GRANT SELECT,INSERT,UPDATE ON "User" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "Profile" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "Session" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "AuthToken" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "MfaCredential" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "Consent" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "CoachAssignment" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "AccessGrant" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ReviewerQualification" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "UserGoal" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "SourceImage" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "SourceExtract" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "SourceConflict" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ConflictExtract" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ContentRevision" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ContentSource" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ContentReview" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ContentWithdrawal" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "PolicyVersion" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ReviewSchemaVersion" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ReviewDimension" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ReviewOption" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "Program" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ProgramVersion" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ProgramWithdrawal" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ProgramDay" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "NutritionPlan" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "Meal" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "Ingredient" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "MealIngredient" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "PlanMeal" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "MealAlternative" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ProgramNutritionPlan" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "TaskDefinition" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "RecurrenceDefinition" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "Enrollment" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "EnrollmentDay" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "TaskOccurrence" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "TaskCompletion" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "TaskExclusion" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "MealSelection" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "HealthRecord" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "WaterLog" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "StepDayLog" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ExerciseLog" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "SleepLog" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "HabitDefinition" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "HabitLog" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "DailyReview" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ReviewAnswer" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "CorrectionRequest" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "LogRevision" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "CoachNote" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "AchievementRuleVersion" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ProgramAchievementRule" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "AchievementAward" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "Certificate" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "NotificationPreference" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "ReminderRule" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "PushSubscription" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "Notification" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "OutboxJob" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "IdempotencyRecord" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "RateLimitBucket" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "AuditLog" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "PrivacyRequest" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "DeletionLedger" TO ghidai_app;
GRANT SELECT,INSERT,UPDATE ON "OperationsReport" TO ghidai_app;
REVOKE ALL ON "AccessGrant","ReviewerQualification","RateLimitBucket","AuditLog","DeletionLedger","OperationsReport" FROM ghidai_app;
REVOKE INSERT,UPDATE ON "User","Session","AuthToken","MfaCredential","CoachAssignment","Consent","OutboxJob" FROM ghidai_app;
REVOKE ALL ON FUNCTION actor_id(),active_actor(),can_read(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION actor_id(),active_actor(),can_read(uuid,text) TO ghidai_app,ghidai_policy;
RESET ROLE;
COMMIT;
