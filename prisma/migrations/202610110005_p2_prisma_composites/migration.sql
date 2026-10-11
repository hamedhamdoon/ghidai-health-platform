BEGIN;
SET ROLE ghidai_owner;
-- Prisma 7 introspection needs exact composite uniques on one-to-one relations,
-- even when a constituent column is already globally unique.
ALTER TABLE "Certificate" ADD UNIQUE("userId","awardId");
ALTER TABLE "WaterLog" ADD UNIQUE("userId","recordId","recordKind");
ALTER TABLE "StepDayLog" ADD UNIQUE("userId","recordId","recordKind");
ALTER TABLE "ExerciseLog" ADD UNIQUE("userId","recordId","recordKind");
ALTER TABLE "SleepLog" ADD UNIQUE("userId","recordId","recordKind");
ALTER TABLE "DailyReview" ADD UNIQUE("userId","recordId","recordKind");
ALTER TABLE "MealSelection" ADD UNIQUE("userId","occurrenceId");
ALTER TABLE "TaskCompletion" ADD UNIQUE("userId","occurrenceId");
ALTER TABLE "TaskExclusion" ADD UNIQUE("userId","occurrenceId");
RESET ROLE;
COMMIT;
