BEGIN;
SET ROLE ghidai_owner;

-- No health text in constraint errors. Immutable evidence and configuration.
CREATE FUNCTION reject_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='IMMUTABLE_RECORD'; END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_change();
CREATE TRIGGER review_immutable BEFORE UPDATE OR DELETE ON "ContentReview" FOR EACH ROW EXECUTE FUNCTION reject_change();
CREATE TRIGGER extract_immutable BEFORE UPDATE OR DELETE ON "SourceExtract" FOR EACH ROW EXECUTE FUNCTION reject_change();
CREATE TRIGGER policy_immutable BEFORE UPDATE OR DELETE ON "PolicyVersion" FOR EACH ROW EXECUTE FUNCTION reject_change();
CREATE TRIGGER log_revision_immutable BEFORE UPDATE OR DELETE ON "LogRevision" FOR EACH ROW EXECUTE FUNCTION reject_change();
CREATE TRIGGER content_withdrawal_immutable BEFORE UPDATE OR DELETE ON "ContentWithdrawal" FOR EACH ROW EXECUTE FUNCTION reject_change();
CREATE TRIGGER program_withdrawal_immutable BEFORE UPDATE OR DELETE ON "ProgramWithdrawal" FOR EACH ROW EXECUTE FUNCTION reject_change();

CREATE FUNCTION content_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE author uuid; hash text; scope_name text;
BEGIN
  IF TG_TABLE_NAME='ContentReview' THEN
    SELECT "authorId","contentHash",kind INTO author,hash,scope_name FROM "ContentRevision" WHERE id=NEW."revisionId" FOR UPDATE;
    IF author=NEW."reviewerId" OR hash<>NEW."reviewedHash" OR NOT EXISTS(SELECT 1 FROM "ReviewerQualification" WHERE id=NEW."qualificationId" AND "reviewerId"=NEW."reviewerId" AND scope=scope_name AND status='ACTIVE' AND "validUntil">NEW."decidedAt") THEN
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='REVIEW_REJECTED';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP<>'INSERT' AND OLD.status IN ('APPROVED','WITHDRAWN') THEN
    IF TG_OP='UPDATE' AND OLD.status='APPROVED' AND NEW.status='WITHDRAWN' AND (to_jsonb(NEW)-'status'-'updatedAt'-'revision')=(to_jsonb(OLD)-'status'-'updatedAt'-'revision') AND EXISTS(SELECT 1 FROM "ContentWithdrawal" WHERE "revisionId"=OLD.id) THEN RETURN NEW; END IF;
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_CONTENT';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NEW."previousRevisionId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "ContentRevision" WHERE id=NEW."previousRevisionId" AND "contentKey"=NEW."contentKey" AND version<NEW.version) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVISION_CHAIN_REJECTED';
  END IF;
  IF NEW.status='APPROVED' AND NOT EXISTS(SELECT 1 FROM "ContentReview" WHERE "revisionId"=NEW.id AND decision='APPROVED' AND "reviewedHash"=NEW."contentHash") THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='APPROVAL_REQUIRED';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER content_integrity BEFORE INSERT OR UPDATE OR DELETE ON "ContentRevision" FOR EACH ROW EXECUTE FUNCTION content_integrity();
CREATE TRIGGER review_integrity BEFORE INSERT ON "ContentReview" FOR EACH ROW EXECUTE FUNCTION content_integrity();

CREATE FUNCTION program_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' AND OLD.status IN ('PUBLISHED','WITHDRAWN') THEN
    IF TG_OP='UPDATE' AND OLD.status='PUBLISHED' AND NEW.status='WITHDRAWN' AND (to_jsonb(NEW)-'status'-'updatedAt'-'revision')=(to_jsonb(OLD)-'status'-'updatedAt'-'revision') AND EXISTS(SELECT 1 FROM "ProgramWithdrawal" WHERE "versionId"=OLD.id) THEN RETURN NEW; END IF;
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_PROGRAM';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  -- P2 has no publishing service: fail closed, including direct SQL publication.
  IF NEW.status='PUBLISHED' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='PUBLISH_SERVICE_NOT_IMPLEMENTED'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER program_integrity BEFORE INSERT OR UPDATE OR DELETE ON "ProgramVersion" FOR EACH ROW EXECUTE FUNCTION program_integrity();

CREATE FUNCTION program_child_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v uuid; old_v uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN old_v=OLD."versionId"; END IF;
  IF TG_OP<>'DELETE' THEN v=NEW."versionId"; END IF;
  IF EXISTS(SELECT 1 FROM "ProgramVersion" WHERE id IN(v,old_v) AND status IN ('PUBLISHED','WITHDRAWN')) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_PROGRAM_CHILD'; END IF;
  IF TG_TABLE_NAME='ProgramDay' AND TG_OP<>'DELETE' AND NOT EXISTS(SELECT 1 FROM "ProgramVersion" WHERE id=v AND NEW."dayIndex"<= "durationDays") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='DAY_OUT_OF_RANGE'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER day_integrity BEFORE INSERT OR UPDATE OR DELETE ON "ProgramDay" FOR EACH ROW EXECUTE FUNCTION program_child_integrity();
CREATE TRIGGER task_integrity BEFORE INSERT OR UPDATE OR DELETE ON "TaskDefinition" FOR EACH ROW EXECUTE FUNCTION program_child_integrity();
CREATE TRIGGER recurrence_integrity BEFORE INSERT OR UPDATE OR DELETE ON "RecurrenceDefinition" FOR EACH ROW EXECUTE FUNCTION program_child_integrity();
CREATE TRIGGER nutrition_link_integrity BEFORE INSERT OR UPDATE OR DELETE ON "ProgramNutritionPlan" FOR EACH ROW EXECUTE FUNCTION program_child_integrity();
CREATE TRIGGER achievement_link_integrity BEFORE INSERT OR UPDATE OR DELETE ON "ProgramAchievementRule" FOR EACH ROW EXECUTE FUNCTION program_child_integrity();

CREATE FUNCTION occurrence_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM "EnrollmentDay" ed JOIN "ProgramDay" pd ON pd."versionId"=ed."versionId" AND pd."dayIndex"=ed."dayIndex" JOIN "TaskDefinition" td ON td."programDayId"=pd.id WHERE ed.id=NEW."dayId" AND td.id=NEW."definitionId") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='OCCURRENCE_DAY_MISMATCH'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER occurrence_integrity BEFORE INSERT OR UPDATE ON "TaskOccurrence" FOR EACH ROW EXECUTE FUNCTION occurrence_integrity();

CREATE FUNCTION selection_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM "TaskOccurrence" o JOIN "TaskDefinition" d ON d.id=o."definitionId" WHERE o.id=NEW."occurrenceId" AND d."planMealId"=NEW."planMealId") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='MEAL_SELECTION_MISMATCH'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER selection_integrity BEFORE INSERT OR UPDATE ON "MealSelection" FOR EACH ROW EXECUTE FUNCTION selection_integrity();

CREATE FUNCTION task_cycle_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(WITH RECURSIVE anchors AS (SELECT id,"anchorTaskId",ARRAY[id] path,false cycle FROM "TaskDefinition" WHERE id=NEW.id UNION ALL SELECT d.id,d."anchorTaskId",a.path||d.id,d.id=ANY(a.path) FROM anchors a JOIN "TaskDefinition" d ON d.id=a."anchorTaskId" WHERE NOT a.cycle) SELECT 1 FROM anchors WHERE cycle) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='TASK_CYCLE'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER task_cycle AFTER INSERT OR UPDATE ON "TaskDefinition" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION task_cycle_guard();

-- Foreign keys bind ownership, while scope also requires matching consent kind.
CREATE FUNCTION assignment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM "Consent" WHERE id=NEW."consentId" AND kind='COACH') OR NOT EXISTS(SELECT 1 FROM "User" WHERE id=NEW."coachId" AND role='COACH') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ASSIGNMENT_REJECTED'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assignment_guard BEFORE INSERT OR UPDATE ON "CoachAssignment" FOR EACH ROW EXECUTE FUNCTION assignment_guard();
REVOKE ALL ON FUNCTION reject_change(),content_integrity(),program_integrity(),program_child_integrity(),occurrence_integrity(),selection_integrity(),task_cycle_guard(),assignment_guard() FROM PUBLIC;
RESET ROLE;
COMMIT;
