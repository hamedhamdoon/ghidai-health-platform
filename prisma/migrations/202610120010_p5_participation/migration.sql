BEGIN;
SET ROLE ghidai_owner;

CREATE POLICY participant_insert ON "EnrollmentDay" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY participant_update ON "EnrollmentDay" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY participant_insert ON "TaskOccurrence" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY participant_update ON "TaskOccurrence" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY participant_delete ON "TaskCompletion" FOR DELETE TO ghidai_app USING(active_actor() AND "userId"=actor_id());
GRANT DELETE ON "TaskCompletion" TO ghidai_app;
GRANT INSERT,UPDATE ON "Enrollment","TaskCompletion" TO ghidai_app;
CREATE POLICY participant_audit ON "AuditLog" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "actorId"=actor_id() AND action LIKE 'P5_%');

-- A joined immutable version remains readable for scheduling/history. Health body
-- visibility still uses the P4 approval/withdrawal gate, never this helper.
CREATE FUNCTION p5_joined_version(vid uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
 BEGIN RETURN active_actor() AND EXISTS(SELECT 1 FROM "Enrollment" WHERE "userId"=actor_id() AND "versionId"=vid); END
$$;
RESET ROLE;
GRANT SELECT ON "Enrollment" TO ghidai_policy;
ALTER FUNCTION p5_joined_version(uuid) OWNER TO ghidai_policy;
REVOKE ALL ON FUNCTION p5_joined_version(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p5_joined_version(uuid) TO ghidai_app;
CREATE FUNCTION p5_lock_join_version(vid uuid,pid uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
DECLARE found_id uuid;
BEGIN
 IF NOT active_actor() THEN RETURN false; END IF;
 SELECT v.id INTO found_id FROM "ProgramVersion" v JOIN "Program" p ON p.id=v."programId" WHERE v.id=vid AND p.id=pid AND v.status='PUBLISHED' AND p.status='ACTIVE' AND p4_visible_version(v.id) FOR SHARE OF v,p;
 RETURN found_id IS NOT NULL;
END $$;
GRANT SELECT,UPDATE ON "ProgramVersion","Program" TO ghidai_policy;
ALTER FUNCTION p5_lock_join_version(uuid,uuid) OWNER TO ghidai_policy;
REVOKE ALL ON FUNCTION p5_lock_join_version(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p5_lock_join_version(uuid,uuid) TO ghidai_app;
SET ROLE ghidai_owner;
CREATE POLICY participant_history ON "ProgramVersion" FOR SELECT TO ghidai_app USING(p5_joined_version(id));
CREATE POLICY participant_history ON "ProgramDay" FOR SELECT TO ghidai_app USING(p5_joined_version("versionId"));
CREATE POLICY participant_history ON "TaskDefinition" FOR SELECT TO ghidai_app USING(p5_joined_version("versionId"));
CREATE POLICY participant_policy ON "PolicyVersion" FOR SELECT TO ghidai_app USING(active_actor() AND EXISTS(SELECT 1 FROM "ProgramVersion" v WHERE v."policyVersionId"="PolicyVersion".id AND (p4_visible_version(v.id) OR p5_joined_version(v.id))));

CREATE FUNCTION p5_enrollment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v "ProgramVersion"; p "PolicyVersion"; zone text; today date;
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT * INTO v FROM "ProgramVersion" WHERE id=NEW."versionId";
  SELECT * INTO p FROM "PolicyVersion" WHERE id=NEW."policyVersionId";
  SELECT timezone INTO zone FROM "Profile" WHERE "userId"=NEW."userId";
  today=(now() AT TIME ZONE NEW."timezoneSnapshot")::date;
  IF current_database() NOT IN ('ghidai_development','ghidai_test') OR NOT p5_lock_join_version(NEW."versionId",NEW."programId") OR NOT EXISTS(SELECT 1 FROM "Program" WHERE id=NEW."programId" AND status='ACTIVE') OR p."streakRule"->>'syntheticOnly' IS DISTINCT FROM 'true' OR zone IS DISTINCT FROM NEW."timezoneSnapshot" OR NEW."startDate"<today OR (v."startMode"='FIXED' AND NEW."startDate" IS DISTINCT FROM v."fixedStartDate") OR NEW.status NOT IN ('SCHEDULED','ACTIVE') OR (NEW.status='ACTIVE') IS DISTINCT FROM (NEW."startDate"=today) OR NEW."withdrawnAt" IS NOT NULL THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ENROLLMENT_GATE';
  END IF;
 ELSE
  IF (to_jsonb(NEW)-'status'-'withdrawnAt'-'revision'-'updatedAt') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'withdrawnAt'-'revision'-'updatedAt') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_ENROLLMENT_SNAPSHOT'; END IF;
  IF NEW.status<>OLD.status AND NOT ((OLD.status='SCHEDULED' AND NEW.status IN ('ACTIVE','WITHDRAWN','COMPLETED')) OR (OLD.status='ACTIVE' AND NEW.status IN ('COMPLETED','WITHDRAWN'))) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ENROLLMENT_TRANSITION'; END IF;
  SELECT * INTO v FROM "ProgramVersion" WHERE id=NEW."versionId";
  SELECT * INTO p FROM "PolicyVersion" WHERE id=NEW."policyVersionId";
  today=(now() AT TIME ZONE NEW."timezoneSnapshot")::date;
  IF (NEW.status='ACTIVE' AND NEW."startDate">today) OR (NEW.status='COMPLETED' AND today<NEW."startDate"+v."durationDays"+p."lateWindowDays") OR (NEW.status='WITHDRAWN') IS DISTINCT FROM (NEW."withdrawnAt" IS NOT NULL) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ENROLLMENT_TIME_GATE'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p5_enrollment_guard BEFORE INSERT OR UPDATE ON "Enrollment" FOR EACH ROW EXECUTE FUNCTION p5_enrollment_guard();

CREATE FUNCTION p5_day_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e "Enrollment"; p "PolicyVersion";
BEGIN
 SELECT * INTO e FROM "Enrollment" WHERE id=NEW."enrollmentId";
 SELECT * INTO p FROM "PolicyVersion" WHERE id=e."policyVersionId";
 IF NEW."localDate"<>e."startDate"+NEW."dayIndex"-1 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='DAY_DATE_MISMATCH'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'state'-'exclusionReason'-'revision'-'updatedAt') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'exclusionReason'-'revision'-'updatedAt') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_DAY_SNAPSHOT'; END IF;
  IF NEW.state<>OLD.state AND NOT (OLD.state='OPEN' AND NEW.state IN ('LOCKED','EXCLUDED')) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='DAY_TRANSITION'; END IF;
 END IF;
 IF NEW.state='LOCKED' AND e.status<>'WITHDRAWN' AND (now() AT TIME ZONE e."timezoneSnapshot")::date<=NEW."localDate"+p."lateWindowDays" THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='DAY_LOCK_TOO_EARLY'; END IF;
 IF NEW.state='EXCLUDED' AND (NEW."exclusionReason" IS NULL OR NOT EXISTS(SELECT 1 FROM "ProgramWithdrawal" WHERE "versionId"=e."versionId" AND safety)) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='DAY_EXCLUSION_REQUIRES_SAFETY'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p5_day_guard BEFORE INSERT OR UPDATE ON "EnrollmentDay" FOR EACH ROW EXECUTE FUNCTION p5_day_guard();
CREATE FUNCTION p5_occurrence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t "TaskDefinition";
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT * INTO t FROM "TaskDefinition" WHERE id=NEW."definitionId";
  IF t.id IS NULL OR NEW."requiredSnapshot" IS DISTINCT FROM t.required OR NEW."targetSnapshot" IS DISTINCT FROM t."defaultTarget" OR NEW.metric IS DISTINCT FROM t.metric OR NEW."orderSnapshot"<>t."order" THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='OCCURRENCE_DEFINITION_MISMATCH'; END IF;
  RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-'revision'-'updatedAt') IS DISTINCT FROM (to_jsonb(OLD)-'revision'-'updatedAt') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_OCCURRENCE_SNAPSHOT'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p5_occurrence_guard BEFORE INSERT OR UPDATE ON "TaskOccurrence" FOR EACH ROW EXECUTE FUNCTION p5_occurrence_guard();
CREATE FUNCTION p5_enrollment_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE duration integer;
BEGIN
 SELECT "durationDays" INTO duration FROM "ProgramVersion" WHERE id=NEW."versionId";
 IF (SELECT count(*) FROM "EnrollmentDay" WHERE "enrollmentId"=NEW.id)<>duration OR EXISTS(SELECT 1 FROM "EnrollmentDay" d WHERE d."enrollmentId"=NEW.id AND (SELECT count(*) FROM "TaskOccurrence" o WHERE o."dayId"=d.id)<>(SELECT count(*) FROM "TaskDefinition" t JOIN "ProgramDay" pd ON pd.id=t."programDayId" WHERE pd."versionId"=NEW."versionId" AND pd."dayIndex"=d."dayIndex")) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INCOMPLETE_ENROLLMENT_SNAPSHOT'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER p5_enrollment_complete AFTER INSERT ON "Enrollment" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION p5_enrollment_complete();
CREATE FUNCTION p5_completion_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oid uuid; d "EnrollmentDay"; e "Enrollment"; p "PolicyVersion"; t "TaskDefinition"; today date;
BEGIN
 IF TG_OP='DELETE' THEN oid=OLD."occurrenceId"; ELSE oid=NEW."occurrenceId"; END IF;
 SELECT ed.* INTO d FROM "EnrollmentDay" ed JOIN "TaskOccurrence" o ON o."dayId"=ed.id WHERE o.id=oid;
 SELECT * INTO e FROM "Enrollment" WHERE id=d."enrollmentId";
 SELECT * INTO p FROM "PolicyVersion" WHERE id=e."policyVersionId";
 SELECT td.* INTO t FROM "TaskDefinition" td JOIN "TaskOccurrence" o ON o."definitionId"=td.id WHERE o.id=oid;
 today=(now() AT TIME ZONE e."timezoneSnapshot")::date;
 IF d.state<>'OPEN' OR e.status<>'ACTIVE' OR d."localDate">today OR d."localDate"+p."lateWindowDays"<today OR NOT p4_visible_version(e."versionId") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='COMPLETION_WINDOW_GATE'; END IF;
 IF TG_OP<>'DELETE' AND ((NEW.mode='MANUAL' AND t."completionMode"<>'MANUAL') OR (NEW.mode='DERIVED' AND t."completionMode"<>'THRESHOLD') OR NEW."completedAt">now() OR (NEW."completedAt" AT TIME ZONE e."timezoneSnapshot")::date<>d."localDate") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='COMPLETION_SOURCE_GATE'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER p5_completion_guard BEFORE INSERT OR UPDATE OR DELETE ON "TaskCompletion" FOR EACH ROW EXECUTE FUNCTION p5_completion_guard();
REVOKE ALL ON FUNCTION p5_enrollment_guard(),p5_day_guard(),p5_occurrence_guard(),p5_completion_guard(),p5_enrollment_complete() FROM PUBLIC;
RESET ROLE;
COMMIT;
