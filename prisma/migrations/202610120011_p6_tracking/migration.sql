BEGIN;
SET ROLE ghidai_owner;
-- Existing records keep their event anchor. No past record is reinterpreted
-- using a subsequently changed profile timezone.
ALTER TABLE "ExerciseLog" ADD COLUMN "timezoneSnapshot" varchar(64) NOT NULL DEFAULT 'UTC';
ALTER TABLE "StepDayLog" ADD COLUMN "recordedForTime" timestamptz;
UPDATE "StepDayLog" SET "recordedForTime"=("localDate"+time '12:00') AT TIME ZONE "timezoneSnapshot";
ALTER TABLE "StepDayLog" ALTER COLUMN "recordedForTime" SET NOT NULL;
ALTER TABLE "DailyReview" ADD COLUMN "timezoneSnapshot" varchar(64) NOT NULL DEFAULT 'UTC',ADD COLUMN "deletedAt" timestamptz;
ALTER TABLE "HabitLog" ADD COLUMN "deletedAt" timestamptz;
CREATE POLICY participant_history_insert ON "LogRevision" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY participant_answer_delete ON "ReviewAnswer" FOR DELETE TO ghidai_app USING(active_actor() AND "userId"=actor_id());
GRANT DELETE ON "ReviewAnswer" TO ghidai_app;
CREATE POLICY participant_p6_audit ON "AuditLog" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "actorId"=actor_id() AND action LIKE 'P6_%');
CREATE POLICY participant_schema ON "ReviewSchemaVersion" FOR SELECT TO ghidai_app USING(active_actor() AND name LIKE 'synthetic-local-%');
CREATE POLICY participant_dimension ON "ReviewDimension" FOR SELECT TO ghidai_app USING(active_actor() AND EXISTS(SELECT 1 FROM "ReviewSchemaVersion" s WHERE s.id="schemaId" AND s.name LIKE 'synthetic-local-%'));
CREATE POLICY participant_option ON "ReviewOption" FOR SELECT TO ghidai_app USING(active_actor() AND EXISTS(SELECT 1 FROM "ReviewDimension" d WHERE d.id="dimensionId"));
CREATE FUNCTION p6_record_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='DailyReview' THEN
  IF NEW."schemaVersionId"<>OLD."schemaVersionId" OR NEW."localDate"<>OLD."localDate" OR NEW."timezoneSnapshot"<>OLD."timezoneSnapshot" THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_REVIEW_IDENTITY'; END IF;
 ELSIF NEW."timezoneSnapshot"<>OLD."timezoneSnapshot" THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_LOG_TIMEZONE'; END IF;
 IF NEW."userId"<>OLD."userId" OR NEW."recordId"<>OLD."recordId" THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_LOG_OWNER'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p6_water_identity BEFORE UPDATE ON "WaterLog" FOR EACH ROW EXECUTE FUNCTION p6_record_identity();
CREATE TRIGGER p6_steps_identity BEFORE UPDATE ON "StepDayLog" FOR EACH ROW EXECUTE FUNCTION p6_record_identity();
CREATE TRIGGER p6_exercise_identity BEFORE UPDATE ON "ExerciseLog" FOR EACH ROW EXECUTE FUNCTION p6_record_identity();
CREATE TRIGGER p6_sleep_identity BEFORE UPDATE ON "SleepLog" FOR EACH ROW EXECUTE FUNCTION p6_record_identity();
CREATE TRIGGER p6_review_identity BEFORE UPDATE ON "DailyReview" FOR EACH ROW EXECUTE FUNCTION p6_record_identity();
CREATE FUNCTION p6_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE at timestamptz; day date;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=NEW."timezoneSnapshot") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INVALID_LOG_TIMEZONE'; END IF;
 IF TG_TABLE_NAME='WaterLog' THEN at=NEW."occurredAt";day=NEW."localDate";
 ELSIF TG_TABLE_NAME='StepDayLog' THEN at=NEW."recordedForTime";day=NEW."localDate";
 ELSIF TG_TABLE_NAME='ExerciseLog' THEN at=NEW."startsAt";day=NEW."localDate";
 ELSIF TG_TABLE_NAME='SleepLog' THEN at=NEW."endsAt";day=NEW."wakeDate";
 ELSE
  IF NEW."localDate">(now() AT TIME ZONE NEW."timezoneSnapshot")::date THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='FUTURE_REVIEW'; END IF;
  RETURN NEW;
 END IF;
 IF at>now() OR (at AT TIME ZONE NEW."timezoneSnapshot")::date<>day THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='LOG_EVENT_DATE_GATE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p6_water_time BEFORE INSERT OR UPDATE ON "WaterLog" FOR EACH ROW EXECUTE FUNCTION p6_event_guard();
CREATE TRIGGER p6_step_time BEFORE INSERT OR UPDATE ON "StepDayLog" FOR EACH ROW EXECUTE FUNCTION p6_event_guard();
CREATE TRIGGER p6_exercise_time BEFORE INSERT OR UPDATE ON "ExerciseLog" FOR EACH ROW EXECUTE FUNCTION p6_event_guard();
CREATE TRIGGER p6_sleep_time BEFORE INSERT OR UPDATE ON "SleepLog" FOR EACH ROW EXECUTE FUNCTION p6_event_guard();
CREATE TRIGGER p6_review_time BEFORE INSERT OR UPDATE ON "DailyReview" FOR EACH ROW EXECUTE FUNCTION p6_event_guard();
CREATE OR REPLACE FUNCTION p5_completion_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oid uuid; d "EnrollmentDay"; e "Enrollment"; p "PolicyVersion"; t "TaskDefinition"; today date; value numeric; target numeric;
BEGIN
 IF TG_OP='DELETE' THEN oid=OLD."occurrenceId"; ELSE oid=NEW."occurrenceId"; END IF;
 SELECT ed.* INTO d FROM "EnrollmentDay" ed JOIN "TaskOccurrence" o ON o."dayId"=ed.id WHERE o.id=oid;
 SELECT * INTO e FROM "Enrollment" WHERE id=d."enrollmentId";
 SELECT * INTO p FROM "PolicyVersion" WHERE id=e."policyVersionId";
 SELECT td.* INTO t FROM "TaskDefinition" td JOIN "TaskOccurrence" o ON o."definitionId"=td.id WHERE o.id=oid;
 SELECT "targetSnapshot" INTO target FROM "TaskOccurrence" WHERE id=oid;
 today=(now() AT TIME ZONE e."timezoneSnapshot")::date;
 IF t.metric='WATER_ML' THEN SELECT coalesce(sum("amountMl"),0) INTO value FROM "WaterLog" WHERE "userId"=e."userId" AND "deletedAt" IS NULL AND ("occurredAt" AT TIME ZONE e."timezoneSnapshot")::date=d."localDate";
 ELSIF t.metric='STEPS' THEN SELECT coalesce(max("totalSteps"),0) INTO value FROM "StepDayLog" WHERE "userId"=e."userId" AND "deletedAt" IS NULL AND ("recordedForTime" AT TIME ZONE e."timezoneSnapshot")::date=d."localDate";
 ELSIF t.metric='EXERCISE_MIN' THEN SELECT coalesce(sum("durationMin"),0) INTO value FROM "ExerciseLog" WHERE "userId"=e."userId" AND "deletedAt" IS NULL AND ("startsAt" AT TIME ZONE e."timezoneSnapshot")::date=d."localDate";
 ELSIF t.metric='SLEEP_MIN' THEN SELECT coalesce(sum(extract(epoch FROM ("endsAt"-"startsAt"))/60),0) INTO value FROM "SleepLog" WHERE "userId"=e."userId" AND "deletedAt" IS NULL AND ("endsAt" AT TIME ZONE e."timezoneSnapshot")::date=d."localDate";
 END IF;
 IF TG_OP='DELETE' AND OLD.mode='DERIVED' AND (coalesce(value,0)<target OR NOT p4_visible_version(e."versionId")) THEN RETURN OLD; END IF;
 IF d.state<>'OPEN' OR e.status<>'ACTIVE' OR d."localDate">today OR d."localDate"+p."lateWindowDays"<today OR NOT p4_visible_version(e."versionId") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='COMPLETION_WINDOW_GATE'; END IF;
 IF TG_OP<>'DELETE' AND ((NEW.mode='MANUAL' AND t."completionMode"<>'MANUAL') OR (NEW.mode='DERIVED' AND (t."completionMode"<>'THRESHOLD' OR coalesce(value,0)<target)) OR NEW."completedAt">now() OR (NEW."completedAt" AT TIME ZONE e."timezoneSnapshot")::date<>d."localDate") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='COMPLETION_SOURCE_GATE'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION p6_record_identity(),p6_event_guard() FROM PUBLIC;
RESET ROLE;
COMMIT;
