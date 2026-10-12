BEGIN;
SET ROLE ghidai_owner;
-- Local temporary capabilities are separate from permanent account roles.
CREATE TABLE "P4LocalCapability"("userId" uuid PRIMARY KEY REFERENCES "User"(id), "expiresAt" timestamptz NOT NULL, purpose text NOT NULL CHECK(purpose='SYNTHETIC_LOCAL_ONLY'));
ALTER TABLE "P4LocalCapability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "P4LocalCapability" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ContentRevision" ADD COLUMN "syntheticOnly" boolean NOT NULL DEFAULT false;
CREATE FUNCTION p4_staff() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
 BEGIN RETURN EXISTS(SELECT 1 FROM "User" u JOIN "P4LocalCapability" c ON c."userId"=u.id WHERE u.id=actor_id() AND u.status='ACTIVE' AND u.role IN('ADMIN','COACH') AND c."expiresAt">now() AND current_database() IN('ghidai_development','ghidai_test')); END
$$;
CREATE FUNCTION p4_admin() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN RETURN p4_staff() AND EXISTS(SELECT 1 FROM "User" WHERE id=actor_id() AND role='ADMIN'); END $$;
RESET ROLE;
GRANT SELECT ON "P4LocalCapability","Program","ProgramVersion","ContentRevision","ReviewerQualification" TO ghidai_policy;
ALTER FUNCTION p4_staff() OWNER TO ghidai_policy;
ALTER FUNCTION p4_admin() OWNER TO ghidai_policy;
SET ROLE ghidai_owner;
REVOKE ALL ON FUNCTION p4_staff(),p4_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p4_staff(),p4_admin() TO ghidai_app,ghidai_policy;
CREATE POLICY p4_read ON "P4LocalCapability" FOR SELECT TO ghidai_app USING("userId"=actor_id());
GRANT SELECT ON "P4LocalCapability","ReviewerQualification" TO ghidai_app;
CREATE POLICY p4_qualification_read ON "ReviewerQualification" FOR SELECT TO ghidai_app USING(p4_staff());
CREATE POLICY p4_program_read ON "Program" FOR SELECT TO ghidai_app USING(p4_staff() OR (active_actor() AND status<>'ARCHIVED' AND EXISTS(SELECT 1 FROM "ProgramVersion" v WHERE v."programId"="Program".id AND v.status='PUBLISHED')));
CREATE POLICY p4_program_insert ON "Program" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND "ownerId"=actor_id());
CREATE POLICY p4_program_update ON "Program" FOR UPDATE TO ghidai_app USING(p4_admin() OR (p4_staff() AND "ownerId"=actor_id())) WITH CHECK(p4_admin() OR (p4_staff() AND "ownerId"=actor_id()));
CREATE POLICY p4_version_read ON "ProgramVersion" FOR SELECT TO ghidai_app USING(p4_staff() OR (active_actor() AND status='PUBLISHED'));
CREATE POLICY p4_version_insert ON "ProgramVersion" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND EXISTS(SELECT 1 FROM "Program" p WHERE p.id="programId" AND (p."ownerId"=actor_id() OR p4_admin())));
CREATE POLICY p4_version_update ON "ProgramVersion" FOR UPDATE TO ghidai_app USING(p4_staff() AND EXISTS(SELECT 1 FROM "Program" p WHERE p.id="programId" AND (p."ownerId"=actor_id() OR p4_admin()))) WITH CHECK(p4_staff());
CREATE POLICY p4_content_read ON "ContentRevision" FOR SELECT TO ghidai_app USING(p4_staff() OR (active_actor() AND status='APPROVED' AND "syntheticOnly"));
CREATE POLICY p4_content_insert ON "ContentRevision" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND "authorId"=actor_id() AND status='DRAFT');
CREATE POLICY p4_content_update ON "ContentRevision" FOR UPDATE TO ghidai_app USING(p4_staff()) WITH CHECK(p4_staff());
CREATE POLICY p4_review_read ON "ContentReview" FOR SELECT TO ghidai_app USING(p4_staff());
CREATE POLICY p4_review_insert ON "ContentReview" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND "reviewerId"=actor_id());
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['ProgramDay','TaskDefinition','RecurrenceDefinition','ProgramNutritionPlan','ProgramAchievementRule'] LOOP
 EXECUTE format('CREATE POLICY p4_read ON %I FOR SELECT TO ghidai_app USING(p4_staff() OR EXISTS(SELECT 1 FROM "ProgramVersion" v WHERE v.id="versionId" AND v.status=''PUBLISHED'' AND active_actor()))',t);
 EXECUTE format('CREATE POLICY p4_write ON %I FOR ALL TO ghidai_app USING(p4_staff() AND EXISTS(SELECT 1 FROM "ProgramVersion" v JOIN "Program" p ON p.id=v."programId" WHERE v.id="versionId" AND v.status=''DRAFT'' AND (p."ownerId"=actor_id() OR p4_admin()))) WITH CHECK(p4_staff() AND EXISTS(SELECT 1 FROM "ProgramVersion" v JOIN "Program" p ON p.id=v."programId" WHERE v.id="versionId" AND v.status=''DRAFT'' AND (p."ownerId"=actor_id() OR p4_admin())))',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['ContentSource','Meal','Ingredient','MealIngredient','NutritionPlan','PlanMeal','MealAlternative','SourceImage','SourceExtract','SourceConflict','ConflictExtract','PolicyVersion','ReviewSchemaVersion','ReviewDimension','ReviewOption'] LOOP
 EXECUTE format('CREATE POLICY p4_local_read ON %I FOR SELECT TO ghidai_app USING(p4_staff())',t);
 END LOOP; END $$;
GRANT DELETE ON "TaskDefinition","RecurrenceDefinition" TO ghidai_app;
CREATE POLICY p4_source_insert ON "ContentSource" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND EXISTS(SELECT 1 FROM "ContentRevision" c WHERE c.id="revisionId" AND c."authorId"=actor_id() AND c.status='DRAFT'));
CREATE POLICY p4_meal_insert ON "Meal" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND EXISTS(SELECT 1 FROM "ContentRevision" c WHERE c.id="contentRevisionId" AND c."authorId"=actor_id() AND c.status='DRAFT'));
CREATE POLICY p4_ingredient_insert ON "Ingredient" FOR INSERT TO ghidai_app WITH CHECK(p4_staff());
CREATE POLICY p4_meal_ingredient_insert ON "MealIngredient" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND EXISTS(SELECT 1 FROM "Meal" m JOIN "ContentRevision" c ON c.id=m."contentRevisionId" WHERE m.id="mealId" AND c."authorId"=actor_id() AND c.status='DRAFT'));
CREATE POLICY p4_plan_insert ON "NutritionPlan" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND EXISTS(SELECT 1 FROM "ContentRevision" c WHERE c.id="contentRevisionId" AND c."authorId"=actor_id() AND c.status='DRAFT'));
CREATE POLICY p4_plan_meal_insert ON "PlanMeal" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND EXISTS(SELECT 1 FROM "NutritionPlan" n JOIN "ContentRevision" c ON c.id=n."contentRevisionId" WHERE n.id="planId" AND c."authorId"=actor_id() AND c.status='DRAFT'));
CREATE POLICY p4_alternative_insert ON "MealAlternative" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND EXISTS(SELECT 1 FROM "PlanMeal" p JOIN "NutritionPlan" n ON n.id=p."planId" JOIN "ContentRevision" c ON c.id=n."contentRevisionId" WHERE p.id="planMealId" AND c."authorId"=actor_id() AND c.status='DRAFT'));
CREATE POLICY p4_withdraw_insert ON "ProgramWithdrawal" FOR INSERT TO ghidai_app WITH CHECK(p4_admin() AND "authorizedBy"=actor_id());
CREATE POLICY p4_withdraw_read ON "ProgramWithdrawal" FOR SELECT TO ghidai_app USING(p4_staff());
CREATE POLICY p4_content_withdraw_insert ON "ContentWithdrawal" FOR INSERT TO ghidai_app WITH CHECK(p4_admin() AND "authorizedBy"=actor_id());
CREATE POLICY p4_content_withdraw_read ON "ContentWithdrawal" FOR SELECT TO ghidai_app USING(p4_staff());
CREATE POLICY p4_audit_insert ON "AuditLog" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND "actorId"=actor_id());
GRANT INSERT ON "AuditLog" TO ghidai_app;
CREATE FUNCTION p4_content_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN IF NEW.status<>'DRAFT' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='DRAFT_REQUIRED'; END IF; RETURN NEW; END IF;
 IF NEW.status<>OLD.status AND NOT ((OLD.status='DRAFT' AND NEW.status='IN_REVIEW') OR (OLD.status='IN_REVIEW' AND NEW.status IN('APPROVED','REJECTED')) OR (OLD.status='APPROVED' AND NEW.status='WITHDRAWN')) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INVALID_CONTENT_TRANSITION'; END IF;
 IF OLD.status<>'DRAFT' AND (to_jsonb(NEW)-'status'-'revision'-'updatedAt')<>(to_jsonb(OLD)-'status'-'revision'-'updatedAt') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='NEW_REVISION_REQUIRED'; END IF;
 IF OLD.status='DRAFT' AND actor_id() IS NOT NULL AND OLD."authorId"<>actor_id() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='AUTHOR_REQUIRED'; END IF;
 IF NEW.status IN('APPROVED','REJECTED') AND NEW.status<>OLD.status AND NOT EXISTS(SELECT 1 FROM "ContentReview" r JOIN "ReviewerQualification" q ON q.id=r."qualificationId" WHERE r."revisionId"=NEW.id AND r.decision=NEW.status::text AND r."reviewedHash"=NEW."contentHash" AND r."reviewerId"=actor_id() AND q.status='ACTIVE' AND q."validUntil">now()) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVIEW_REQUIRED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p4_content_transition BEFORE INSERT OR UPDATE ON "ContentRevision" FOR EACH ROW EXECUTE FUNCTION p4_content_transition();
CREATE FUNCTION p4_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW."decidedAt">now()+interval '1 second' OR NEW."decidedAt"<now()-interval '1 minute' OR NOT EXISTS(SELECT 1 FROM "ContentRevision" WHERE id=NEW."revisionId" AND status='IN_REVIEW') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVIEW_STATE_REQUIRED'; END IF; RETURN NEW; END $$;
CREATE TRIGGER p4_review_guard BEFORE INSERT ON "ContentReview" FOR EACH ROW EXECUTE FUNCTION p4_review_guard();
CREATE OR REPLACE FUNCTION program_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' AND OLD.status IN('PUBLISHED','WITHDRAWN') THEN
  IF TG_OP='UPDATE' AND OLD.status='PUBLISHED' AND NEW.status='WITHDRAWN' AND p4_admin() AND (to_jsonb(NEW)-'status'-'updatedAt'-'revision')=(to_jsonb(OLD)-'status'-'updatedAt'-'revision') AND EXISTS(SELECT 1 FROM "ProgramWithdrawal" WHERE "versionId"=OLD.id) THEN RETURN NEW; END IF;
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_PROGRAM';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='INSERT' AND NEW.status<>'DRAFT' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='DRAFT_REQUIRED'; END IF;
 IF TG_OP='UPDATE' AND NEW.status<>OLD.status AND NOT ((OLD.status='DRAFT' AND NEW.status='IN_REVIEW') OR (OLD.status='IN_REVIEW' AND NEW.status IN('DRAFT','PUBLISHED'))) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INVALID_VERSION_TRANSITION'; END IF;
 IF NEW.status='PUBLISHED' THEN
  IF NOT p4_admin() OR NEW."publishedAt" IS NULL OR (SELECT count(*) FROM "ProgramDay" WHERE "versionId"=NEW.id)<>NEW."durationDays" OR NOT EXISTS(SELECT 1 FROM "Program" WHERE id=NEW."programId" AND status='ACTIVE') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='PUBLISH_INCOMPLETE'; END IF;
  IF EXISTS(SELECT 1 FROM "ProgramDay" d WHERE d."versionId"=NEW.id AND NOT EXISTS(SELECT 1 FROM "TaskDefinition" t WHERE t."programDayId"=d.id)) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='EMPTY_DAY'; END IF;
  IF NOT EXISTS(SELECT 1 FROM "ContentRevision" c WHERE c.id=NEW."descriptionRevisionId" AND c.status='APPROVED' AND c."syntheticOnly") OR EXISTS(SELECT 1 FROM "TaskDefinition" t JOIN "ContentRevision" c ON c.id=t."titleRevisionId" WHERE t."versionId"=NEW.id AND (c.status<>'APPROVED' OR NOT c."syntheticOnly")) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='APPROVAL_REQUIRED'; END IF;
  -- Food/source publication stays closed pending A-01/A-05/A-10/A-12.
  IF EXISTS(SELECT 1 FROM "TaskDefinition" WHERE "versionId"=NEW.id AND (type='MEAL' OR "planMealId" IS NOT NULL)) OR EXISTS(SELECT 1 FROM "ProgramNutritionPlan" WHERE "versionId"=NEW.id) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='HEALTH_PUBLICATION_BLOCKED'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE FUNCTION p4_program_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status<>OLD.status AND (NOT p4_admin() OR OLD.status='ARCHIVED' OR NEW.status NOT IN('ACTIVE','PAUSED','ARCHIVED')) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INVALID_PROGRAM_TRANSITION'; END IF;
 IF NEW."ownerId"<>OLD."ownerId" THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_OWNER'; END IF; RETURN NEW; END $$;
CREATE TRIGGER p4_program_transition BEFORE UPDATE ON "Program" FOR EACH ROW EXECUTE FUNCTION p4_program_transition();
REVOKE ALL ON FUNCTION p4_content_transition(),p4_review_guard(),p4_program_transition() FROM PUBLIC;
RESET ROLE;
COMMIT;
