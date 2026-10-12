BEGIN;
SET ROLE ghidai_owner;
CREATE OR REPLACE FUNCTION program_child_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v uuid; old_v uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN old_v=OLD."versionId"; END IF;
  IF TG_OP<>'DELETE' THEN v=NEW."versionId"; END IF;
  IF EXISTS(SELECT 1 FROM "ProgramVersion" WHERE id IN(v,old_v) AND status IN ('PUBLISHED','WITHDRAWN')) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_PROGRAM_CHILD'; END IF;
  IF TG_TABLE_NAME='ProgramDay' AND TG_OP<>'DELETE' THEN
    IF NOT EXISTS(SELECT 1 FROM "ProgramVersion" WHERE id=v AND NEW."dayIndex"<= "durationDays") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='DAY_OUT_OF_RANGE'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;

ALTER TABLE "MealSelection" ADD FOREIGN KEY("planMealId") REFERENCES "PlanMeal"(id) ON DELETE RESTRICT;
CREATE INDEX selection_plan_idx ON "MealSelection"("planMealId");

CREATE FUNCTION content_child_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid uuid; old_rid uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN old_rid=OLD."revisionId"; END IF;
  IF TG_OP<>'DELETE' THEN rid=NEW."revisionId"; END IF;
  IF EXISTS(SELECT 1 FROM "ContentRevision" WHERE id IN(rid,old_rid) AND status IN ('APPROVED','WITHDRAWN')) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_CONTENT_SOURCE'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER content_source_guard BEFORE INSERT OR UPDATE OR DELETE ON "ContentSource" FOR EACH ROW EXECUTE FUNCTION content_child_guard();

CREATE FUNCTION review_child_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sid uuid; old_sid uuid;
BEGIN
  IF TG_TABLE_NAME='ReviewDimension' THEN
    IF TG_OP<>'INSERT' THEN old_sid=OLD."schemaId"; END IF;
    IF TG_OP<>'DELETE' THEN sid=NEW."schemaId"; END IF;
  ELSE
    IF TG_OP<>'INSERT' THEN SELECT "schemaId" INTO old_sid FROM "ReviewDimension" WHERE id=OLD."dimensionId"; END IF;
    IF TG_OP<>'DELETE' THEN SELECT "schemaId" INTO sid FROM "ReviewDimension" WHERE id=NEW."dimensionId"; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM "ReviewSchemaVersion" WHERE id IN(sid,old_sid) AND status IN ('PUBLISHED','WITHDRAWN')) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_REVIEW_SCHEMA'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER dimension_guard BEFORE INSERT OR UPDATE OR DELETE ON "ReviewDimension" FOR EACH ROW EXECUTE FUNCTION review_child_guard();
CREATE TRIGGER option_guard BEFORE INSERT OR UPDATE OR DELETE ON "ReviewOption" FOR EACH ROW EXECUTE FUNCTION review_child_guard();

CREATE FUNCTION schema_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('PUBLISHED','WITHDRAWN') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_VERSION'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER schema_guard BEFORE UPDATE OR DELETE ON "ReviewSchemaVersion" FOR EACH ROW EXECUTE FUNCTION schema_guard();
CREATE TRIGGER achievement_guard BEFORE UPDATE OR DELETE ON "AchievementRuleVersion" FOR EACH ROW EXECUTE FUNCTION schema_guard();

CREATE FUNCTION safe_security_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  INSERT INTO "AuditLog"("actorId",action,"targetType","targetId","requestId","occurredAt","safeMetadata") VALUES(actor_id(),TG_OP,TG_TABLE_NAME,NEW.id,gen_random_uuid(),now(),jsonb_build_object('revision',NEW.revision));
  RETURN NEW;
END $$;
CREATE TRIGGER grant_audit AFTER INSERT OR UPDATE ON "AccessGrant" FOR EACH ROW EXECUTE FUNCTION safe_security_audit();
CREATE TRIGGER consent_audit AFTER INSERT OR UPDATE ON "Consent" FOR EACH ROW EXECUTE FUNCTION safe_security_audit();
CREATE TRIGGER assignment_audit AFTER INSERT OR UPDATE ON "CoachAssignment" FOR EACH ROW EXECUTE FUNCTION safe_security_audit();
REVOKE ALL ON FUNCTION content_child_guard(),review_child_guard(),schema_guard(),safe_security_audit() FROM PUBLIC;
RESET ROLE;
GRANT INSERT ON "AuditLog" TO ghidai_policy;
ALTER FUNCTION safe_security_audit() OWNER TO ghidai_policy;
COMMIT;
