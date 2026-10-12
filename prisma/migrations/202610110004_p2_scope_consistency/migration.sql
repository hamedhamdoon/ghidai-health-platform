BEGIN;
SET ROLE ghidai_owner;
RESET ROLE;
CREATE OR REPLACE FUNCTION can_read(subject uuid, resource_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
SELECT EXISTS (SELECT 1 FROM "User" u JOIN "AccessGrant" g ON g."subjectId"=u.id JOIN "CoachAssignment" a ON a.id=g."assignmentId" JOIN "Consent" c ON c.id=g."consentId" WHERE u.id=actor_id() AND u.role='COACH' AND u.status='ACTIVE' AND g."scopeUserId"=subject AND g.resource=resource_name AND g.action='READ' AND g."revokedAt" IS NULL AND now()>=g."startsAt" AND now()<g."expiresAt" AND a."revokedAt" IS NULL AND now()>=a."startsAt" AND now()<a."expiresAt" AND c.kind='COACH' AND c."revokedAt" IS NULL AND now()>=c."grantedAt" AND now()<c."expiresAt" AND c.scope @> jsonb_build_object('resources',jsonb_build_array(resource_name),'actions',jsonb_build_array('READ'))) $$;
SET ROLE ghidai_owner;
CREATE UNIQUE INDEX grant_active ON "AccessGrant"("subjectId","scopeUserId",resource,action,"assignmentId") WHERE "revokedAt" IS NULL;
ALTER TABLE "AccessGrant" ADD CHECK(length(trim(reason))>0);

CREATE FUNCTION reference_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='TaskExclusion' THEN
    IF NOT EXISTS(SELECT 1 FROM "TaskOccurrence" o JOIN "ProgramWithdrawal" w ON w."versionId"=o."versionId" WHERE o.id=NEW."occurrenceId" AND w.id=NEW."sourceWithdrawalId") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='WITHDRAWAL_VERSION_MISMATCH'; END IF;
  ELSIF TG_TABLE_NAME='ReminderRule' THEN
    IF NEW."taskDefinitionId" IS NOT NULL AND (NEW."enrollmentId" IS NULL OR NOT EXISTS(SELECT 1 FROM "Enrollment" e JOIN "TaskDefinition" d ON d."versionId"=e."versionId" WHERE e.id=NEW."enrollmentId" AND d.id=NEW."taskDefinitionId")) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REMINDER_VERSION_MISMATCH'; END IF;
  ELSIF TG_TABLE_NAME='AchievementAward' THEN
    IF NOT EXISTS(SELECT 1 FROM "Enrollment" e JOIN "ProgramAchievementRule" r ON r."versionId"=e."versionId" WHERE e.id=NEW."enrollmentId" AND r."ruleVersionId"=NEW."ruleVersionId") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='AWARD_VERSION_MISMATCH'; END IF;
  ELSIF TG_TABLE_NAME='MealAlternative' THEN
    IF EXISTS(SELECT 1 FROM "PlanMeal" p JOIN "Meal" m ON m."contentRevisionId"=p."mealRevisionId" WHERE p.id=NEW."planMealId" AND m.id=NEW."alternativeMealId") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='SELF_ALTERNATIVE'; END IF;
  ELSIF TG_TABLE_NAME='TaskDefinition' THEN
    IF NEW."planMealId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "PlanMeal" p JOIN "ProgramNutritionPlan" n ON n."planId"=p."planId" WHERE p.id=NEW."planMealId" AND n."versionId"=NEW."versionId") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='TASK_NUTRITION_VERSION_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER exclusion_consistency BEFORE INSERT OR UPDATE ON "TaskExclusion" FOR EACH ROW EXECUTE FUNCTION reference_consistency();
CREATE TRIGGER reminder_consistency BEFORE INSERT OR UPDATE ON "ReminderRule" FOR EACH ROW EXECUTE FUNCTION reference_consistency();
CREATE TRIGGER award_consistency BEFORE INSERT OR UPDATE ON "AchievementAward" FOR EACH ROW EXECUTE FUNCTION reference_consistency();
CREATE TRIGGER alternative_consistency BEFORE INSERT OR UPDATE ON "MealAlternative" FOR EACH ROW EXECUTE FUNCTION reference_consistency();
CREATE TRIGGER task_nutrition_consistency BEFORE INSERT OR UPDATE ON "TaskDefinition" FOR EACH ROW EXECUTE FUNCTION reference_consistency();
REVOKE ALL ON FUNCTION reference_consistency() FROM PUBLIC;
-- P2 has no enrollment/derived-completion service; writes fail closed until implemented.
REVOKE INSERT,UPDATE ON "Enrollment","TaskCompletion","MealSelection","ReminderRule","Notification","PrivacyRequest" FROM ghidai_app;
RESET ROLE;
ALTER FUNCTION can_read(uuid,text) OWNER TO ghidai_policy;
COMMIT;
