BEGIN;
SET ROLE ghidai_owner;
CREATE FUNCTION p6_exercise_finished_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."deletedAt" IS NULL AND NEW."startsAt"+NEW."durationMin"*interval '1 minute'>now() THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='EXERCISE_END_FUTURE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p6_exercise_finished_guard BEFORE INSERT OR UPDATE ON "ExerciseLog" FOR EACH ROW EXECUTE FUNCTION p6_exercise_finished_guard();
REVOKE ALL ON FUNCTION p6_exercise_finished_guard() FROM PUBLIC;
RESET ROLE;
COMMIT;
