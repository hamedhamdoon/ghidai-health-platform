BEGIN;
SET ROLE ghidai_owner;
ALTER POLICY participant_schema ON "ReviewSchemaVersion" USING(active_actor() AND name LIKE 'synthetic-local-%' AND (status='PUBLISHED' OR EXISTS(SELECT 1 FROM "DailyReview" r WHERE r."schemaVersionId"="ReviewSchemaVersion".id AND r."userId"=actor_id())));
CREATE FUNCTION p6_review_schema_complete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='PUBLISHED' AND (NOT EXISTS(SELECT 1 FROM "ReviewDimension" WHERE "schemaId"=NEW.id) OR EXISTS(SELECT 1 FROM "ReviewDimension" d WHERE d."schemaId"=NEW.id AND NOT EXISTS(SELECT 1 FROM "ReviewOption" o WHERE o."dimensionId"=d.id))) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INCOMPLETE_REVIEW_SCHEMA'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p6_review_schema_complete BEFORE INSERT OR UPDATE ON "ReviewSchemaVersion" FOR EACH ROW EXECUTE FUNCTION p6_review_schema_complete();
REVOKE ALL ON FUNCTION p6_review_schema_complete() FROM PUBLIC;
RESET ROLE;
COMMIT;
