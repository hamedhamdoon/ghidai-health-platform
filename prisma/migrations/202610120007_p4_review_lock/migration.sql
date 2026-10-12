BEGIN;
SET ROLE ghidai_owner;
CREATE OR REPLACE FUNCTION p4_review_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
DECLARE q "ReviewerQualification"; c "ContentRevision";
BEGIN
 SELECT * INTO q FROM "ReviewerQualification" WHERE id=NEW."qualificationId" FOR SHARE;
 SELECT * INTO c FROM "ContentRevision" WHERE id=NEW."revisionId";
 IF NOT p4_staff() OR NEW."reviewerId"<>actor_id() OR c.status<>'IN_REVIEW' OR c."authorId"=NEW."reviewerId" OR q."reviewerId"<>NEW."reviewerId" OR q.scope<>c.kind OR q.status<>'ACTIVE' OR q."validUntil"<=clock_timestamp() OR NEW."reviewedHash"<>c."contentHash" OR NEW."decidedAt">clock_timestamp()+interval '1 second' OR NEW."decidedAt"<clock_timestamp()-interval '1 minute' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVIEW_STATE_REQUIRED'; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION p4_review_guard() FROM PUBLIC;
RESET ROLE;
GRANT UPDATE ON "ReviewerQualification" TO ghidai_policy;
ALTER FUNCTION p4_review_guard() OWNER TO ghidai_policy;
COMMIT;
