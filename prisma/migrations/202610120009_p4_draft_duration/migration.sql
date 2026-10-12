BEGIN;
SET ROLE ghidai_owner;
GRANT DELETE ON "ProgramDay" TO ghidai_app;
CREATE OR REPLACE FUNCTION p4_freeze_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW."programId"<>OLD."programId" OR NEW.id<>OLD.id OR NEW.version<>OLD.version THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_VERSION_IDENTITY'; END IF;
 IF OLD.status='IN_REVIEW' AND (to_jsonb(NEW)-'status'-'revision'-'updatedAt'-'publishedAt')<>(to_jsonb(OLD)-'status'-'revision'-'updatedAt'-'publishedAt') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='RETURN_TO_DRAFT_REQUIRED'; END IF; RETURN NEW;
END $$;
CREATE FUNCTION p4_content_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW."authorId"<>OLD."authorId" OR NEW."contentKey"<>OLD."contentKey" OR NEW.version<>OLD.version OR NEW."previousRevisionId" IS DISTINCT FROM OLD."previousRevisionId") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_CONTENT_IDENTITY'; END IF;
 IF NEW."syntheticOnly" AND ((TG_OP='UPDATE' AND NOT OLD."syntheticOnly") OR EXISTS(SELECT 1 FROM "ContentRevision" WHERE id=NEW."previousRevisionId" AND NOT "syntheticOnly") OR EXISTS(SELECT 1 FROM "ContentSource" WHERE "revisionId"=NEW.id)) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='SOURCE_PUBLICATION_BLOCKED'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER p4_content_identity BEFORE INSERT OR UPDATE ON "ContentRevision" FOR EACH ROW EXECUTE FUNCTION p4_content_identity();
CREATE FUNCTION p4_source_classifier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE "ContentRevision" SET "syntheticOnly"=false WHERE id=NEW."revisionId";RETURN NEW;END $$;
CREATE TRIGGER p4_source_classifier BEFORE INSERT ON "ContentSource" FOR EACH ROW EXECUTE FUNCTION p4_source_classifier();
REVOKE ALL ON FUNCTION p4_content_identity(),p4_source_classifier() FROM PUBLIC;
ALTER TABLE "TaskDefinition" ADD CONSTRAINT p4_task_order CHECK("order" BETWEEN 1 AND 100);
ALTER TABLE "TaskDefinition" ADD CONSTRAINT p4_task_metric CHECK(("completionMode"='MANUAL' AND metric IS NULL AND "defaultTarget" IS NULL) OR ("completionMode"='THRESHOLD' AND "defaultTarget" BETWEEN 1 AND 200000 AND ((type='STEPS' AND metric='STEPS') OR (type='WATER' AND metric='WATER_ML') OR (type='EXERCISE' AND metric='EXERCISE_MIN') OR (type='SLEEP' AND metric='SLEEP_MIN'))));
ALTER TABLE "RecurrenceDefinition" ADD CONSTRAINT p4_recurrence_template CHECK(jsonb_typeof("taskTemplate")='array' AND jsonb_array_length("taskTemplate")<=100);
CREATE FUNCTION p4_recurrence_bounds() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE duration integer; BEGIN
 SELECT "durationDays" INTO duration FROM "ProgramVersion" WHERE id=NEW."versionId";
 IF EXISTS(SELECT 1 FROM unnest(NEW."dayIndices") d WHERE d<1 OR d>duration) OR cardinality(NEW."dayIndices")<>(SELECT count(DISTINCT d) FROM unnest(NEW."dayIndices") d) OR (NEW.pattern='EVERY_DAY' AND cardinality(NEW."dayIndices")<>duration) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INVALID_RECURRENCE_DAYS'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER p4_recurrence_bounds BEFORE INSERT OR UPDATE ON "RecurrenceDefinition" FOR EACH ROW EXECUTE FUNCTION p4_recurrence_bounds();
CREATE FUNCTION p4_final_program_shape() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status='PUBLISHED' AND (EXISTS(SELECT 1 FROM generate_series(1,NEW."durationDays") d WHERE NOT EXISTS(SELECT 1 FROM "ProgramDay" p WHERE p."versionId"=NEW.id AND p."dayIndex"=d)) OR EXISTS(SELECT 1 FROM "ProgramDay" WHERE "versionId"=NEW.id AND "dayIndex">NEW."durationDays")) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INCOMPLETE_DAY_SEQUENCE'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER p4_final_program_shape BEFORE UPDATE ON "ProgramVersion" FOR EACH ROW EXECUTE FUNCTION p4_final_program_shape();
DO $$ DECLARE body text; BEGIN SELECT pg_get_functiondef('p4_nutrition_ready(uuid)'::regprocedure) INTO body;body=replace(body,'RETURN true;','RETURN NOT EXISTS(SELECT 1 FROM "ProgramNutritionPlan" l WHERE l."versionId"=vid AND NOT EXISTS(SELECT 1 FROM "PlanMeal" p WHERE p."planId"=l."planId"));');EXECUTE body;END $$;
REVOKE ALL ON FUNCTION p4_recurrence_bounds() FROM PUBLIC;
REVOKE ALL ON FUNCTION p4_final_program_shape() FROM PUBLIC;
RESET ROLE;
ALTER TABLE "ContentReview" ADD COLUMN "qualificationSnapshot" jsonb NOT NULL DEFAULT '{}';
DO $$ DECLARE body text; BEGIN SELECT pg_get_functiondef('p4_review_guard()'::regprocedure) INTO body;body=replace(body,'RETURN NEW;','NEW."qualificationSnapshot"=to_jsonb(q); RETURN NEW;');EXECUTE body;END $$;
COMMIT;
