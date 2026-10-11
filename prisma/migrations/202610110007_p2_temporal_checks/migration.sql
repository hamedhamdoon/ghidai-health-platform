BEGIN;
SET ROLE ghidai_owner;
ALTER TABLE "WaterLog" ADD CONSTRAINT water_cup_required CHECK("inputUnit"<>'CUP' OR ("cupMlSnapshot" IS NOT NULL AND "cupMlSnapshot" BETWEEN 1 AND 2000));
ALTER TABLE "WaterLog" ADD CHECK("occurredAt"<="recordedAt");
ALTER TABLE "TaskDefinition" ADD CONSTRAINT window_end_required CHECK("scheduleKind"<>'WINDOW' OR "timeEnd" IS NOT NULL);
ALTER TABLE "TaskDefinition" ADD CONSTRAINT metric_pair_required CHECK(("completionMode"='MANUAL' AND metric IS NULL AND "defaultTarget" IS NULL) OR ("completionMode"='THRESHOLD' AND metric IS NOT NULL AND "defaultTarget" IS NOT NULL));

CREATE FUNCTION local_day_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE zone text;
BEGIN
  IF TG_TABLE_NAME='WaterLog' OR TG_TABLE_NAME='SleepLog' OR TG_TABLE_NAME='StepDayLog' OR TG_TABLE_NAME='Enrollment' THEN
    zone=NEW."timezoneSnapshot";
    IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INVALID_TIMEZONE'; END IF;
  END IF;
  IF TG_TABLE_NAME='WaterLog' THEN
    IF NEW."localDate"<>(NEW."occurredAt" AT TIME ZONE zone)::date THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='LOCAL_DATE_MISMATCH'; END IF;
  ELSIF TG_TABLE_NAME='SleepLog' THEN
    IF NEW."wakeDate"<>(NEW."endsAt" AT TIME ZONE zone)::date THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='WAKE_DATE_MISMATCH'; END IF;
  ELSIF TG_TABLE_NAME='EnrollmentDay' THEN
    IF NOT EXISTS(SELECT 1 FROM "Enrollment" WHERE id=NEW."enrollmentId" AND NEW."localDate"="startDate"+(NEW."dayIndex"-1)) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ENROLLMENT_DATE_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER water_local_day BEFORE INSERT OR UPDATE ON "WaterLog" FOR EACH ROW EXECUTE FUNCTION local_day_guard();
CREATE TRIGGER sleep_local_day BEFORE INSERT OR UPDATE ON "SleepLog" FOR EACH ROW EXECUTE FUNCTION local_day_guard();
CREATE TRIGGER steps_timezone BEFORE INSERT OR UPDATE ON "StepDayLog" FOR EACH ROW EXECUTE FUNCTION local_day_guard();
CREATE TRIGGER enrollment_timezone BEFORE INSERT OR UPDATE ON "Enrollment" FOR EACH ROW EXECUTE FUNCTION local_day_guard();
CREATE TRIGGER enrollment_local_day BEFORE INSERT OR UPDATE ON "EnrollmentDay" FOR EACH ROW EXECUTE FUNCTION local_day_guard();
REVOKE ALL ON FUNCTION local_day_guard() FROM PUBLIC;
RESET ROLE;
COMMIT;
