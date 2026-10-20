BEGIN;
SET ROLE ghidai_owner;
CREATE TABLE "RemediationDraft" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), kind text NOT NULL CHECK(kind IN('RULE','REVIEW_SCHEMA')),
 code text NOT NULL CHECK(code ~ '^synthetic-local-[a-z0-9-]+$'), version integer NOT NULL CHECK(version>0),
 "authorId" uuid NOT NULL REFERENCES "User"(id), status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','IN_REVIEW','APPROVED','REJECTED','PUBLISHED','WITHDRAWN')),
 document jsonb NOT NULL, "contentHash" text NOT NULL, "reviewerId" uuid REFERENCES "User"(id), "reviewReason" text, "reviewedAt" timestamptz, "publishedId" uuid, "withdrawReason" text,
 UNIQUE(kind,code,version), CHECK("reviewerId" IS NULL OR "reviewerId"<>"authorId")
);
CREATE INDEX "RemediationDraft_author_idx" ON "RemediationDraft"("authorId");
CREATE INDEX "RemediationDraft_reviewer_idx" ON "RemediationDraft"("reviewerId");
ALTER TABLE "RemediationDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RemediationDraft" FORCE ROW LEVEL SECURITY;
CREATE POLICY draft_read ON "RemediationDraft" FOR SELECT TO ghidai_app USING(p4_staff());
CREATE POLICY draft_insert ON "RemediationDraft" FOR INSERT TO ghidai_app WITH CHECK(p4_staff() AND "authorId"=actor_id() AND status='DRAFT');
CREATE POLICY draft_update ON "RemediationDraft" FOR UPDATE TO ghidai_app USING(p4_staff()) WITH CHECK(p4_staff());
GRANT SELECT,INSERT,UPDATE ON "RemediationDraft" TO ghidai_app;
CREATE FUNCTION p12r1_draft_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN IF NEW.status<>'DRAFT' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='DRAFT_REQUIRED'; END IF; RETURN NEW; END IF;
 IF NEW.kind<>OLD.kind OR NEW.code<>OLD.code OR NEW.version<>OLD.version OR NEW."authorId"<>OLD."authorId" THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_IDENTITY'; END IF;
 IF NEW.document<>OLD.document OR NEW."contentHash"<>OLD."contentHash" THEN
  IF OLD.status<>'DRAFT' OR NEW.status<>'DRAFT' OR actor_id()<>OLD."authorId" THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='NEW_VERSION_REQUIRED'; END IF;
 END IF;
 IF NEW.status=OLD.status THEN IF OLD.status<>'DRAFT' OR actor_id()<>OLD."authorId" THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='AUTHOR_REQUIRED'; END IF; RETURN NEW; END IF;
 IF OLD.status='DRAFT' AND NEW.status='IN_REVIEW' AND actor_id()=OLD."authorId" THEN RETURN NEW; END IF;
 IF OLD.status='IN_REVIEW' AND NEW.status IN('APPROVED','REJECTED') AND actor_id()<>OLD."authorId" AND NEW."reviewerId"=actor_id() AND length(trim(NEW."reviewReason"))>0 AND EXISTS(SELECT 1 FROM "ReviewerQualification" WHERE "reviewerId"=actor_id() AND scope='GUIDANCE' AND status='ACTIVE' AND "validUntil">now() AND "evidenceReference" LIKE 'synthetic-local:%' AND "verifiedBy"<>"reviewerId") THEN RETURN NEW; END IF;
 IF p4_admin() AND OLD.status='APPROVED' AND NEW.status='PUBLISHED' AND NEW."publishedId" IS NOT NULL THEN
  IF NEW.kind='RULE' AND EXISTS(SELECT 1 FROM "AchievementRuleVersion" r WHERE r.id=NEW."publishedId" AND r.code=NEW.code AND r.version=NEW.version AND r.status='PUBLISHED' AND r.type=NEW.document->>'type' AND r.config=NEW.document->'config' AND r."contentRevisionId"=(NEW.document->>'contentRevisionId')::uuid) THEN RETURN NEW; END IF;
  IF NEW.kind='REVIEW_SCHEMA' AND EXISTS(SELECT 1 FROM "ReviewSchemaVersion" s WHERE s.id=NEW."publishedId" AND s.name=NEW.code AND s.version=NEW.version AND s.status='PUBLISHED') AND (SELECT count(*) FROM "ReviewDimension" WHERE "schemaId"=NEW."publishedId")=jsonb_array_length(NEW.document->'dimensions') AND NOT EXISTS(SELECT 1 FROM "ReviewDimension" x WHERE x."schemaId"=NEW."publishedId" AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.document->'dimensions') WITH ORDINALITY AS a(value,n) WHERE value->>'key'=x.key AND value->>'label'=x.label AND n-1=x."order" AND jsonb_array_length(value->'options')=(SELECT count(*) FROM "ReviewOption" WHERE "dimensionId"=x.id) AND NOT EXISTS(SELECT 1 FROM "ReviewOption" o WHERE o."dimensionId"=x.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(value->'options') opt WHERE (opt->>'value')::integer=o.value AND opt->>'label'=o.label)))) THEN RETURN NEW; END IF;
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVIEWED_GRAPH_REQUIRED';
 END IF;
 IF p4_admin() AND OLD.status='PUBLISHED' AND NEW.status='WITHDRAWN' AND length(trim(NEW."withdrawReason"))>0 THEN RETURN NEW; END IF;
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='INVALID_AUTHORING_TRANSITION';
END $$;
CREATE TRIGGER p12r1_draft_guard BEFORE INSERT OR UPDATE ON "RemediationDraft" FOR EACH ROW EXECUTE FUNCTION p12r1_draft_guard();
CREATE FUNCTION p12r1_valid_reviewer(reviewer uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
 BEGIN RETURN p4_staff() AND EXISTS(SELECT 1 FROM "ReviewerQualification" q JOIN "P4LocalCapability" c ON c."userId"=q."reviewerId" JOIN "User" u ON u.id=q."reviewerId" WHERE q."reviewerId"=reviewer AND q.scope='GUIDANCE' AND q.status='ACTIVE' AND q."validUntil">now() AND q."evidenceReference" LIKE 'synthetic-local:%' AND q."verifiedBy"<>q."reviewerId" AND c."expiresAt">now() AND u.status='ACTIVE' AND u.role IN('COACH','ADMIN')); END
$$;
RESET ROLE;
ALTER FUNCTION p12r1_valid_reviewer(uuid) OWNER TO ghidai_policy;
REVOKE ALL ON FUNCTION p12r1_valid_reviewer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p12r1_valid_reviewer(uuid) TO ghidai_app;
SET ROLE ghidai_owner;
CREATE POLICY p12r1_rule_read ON "AchievementRuleVersion" FOR SELECT TO ghidai_app USING(p4_staff());
CREATE POLICY p12r1_rule_insert ON "AchievementRuleVersion" FOR INSERT TO ghidai_app WITH CHECK(p4_admin() AND config->>'syntheticOnly'='true' AND code LIKE 'synthetic-local-%' AND EXISTS(SELECT 1 FROM "RemediationDraft" d WHERE d.kind='RULE' AND d.code="AchievementRuleVersion".code AND d.version="AchievementRuleVersion".version AND d.status='APPROVED'));
CREATE POLICY p12r1_rule_update ON "AchievementRuleVersion" FOR UPDATE TO ghidai_app USING(p4_admin() AND EXISTS(SELECT 1 FROM "RemediationDraft" d WHERE d."publishedId"="AchievementRuleVersion".id AND d.status='PUBLISHED')) WITH CHECK(p4_admin());
CREATE POLICY p12r1_schema_insert ON "ReviewSchemaVersion" FOR INSERT TO ghidai_app WITH CHECK(p4_admin() AND name LIKE 'synthetic-local-%' AND EXISTS(SELECT 1 FROM "RemediationDraft" d WHERE d.kind='REVIEW_SCHEMA' AND d.code="ReviewSchemaVersion".name AND d.version="ReviewSchemaVersion".version AND d.status='APPROVED'));
CREATE POLICY p12r1_schema_update ON "ReviewSchemaVersion" FOR UPDATE TO ghidai_app USING(p4_admin() AND EXISTS(SELECT 1 FROM "RemediationDraft" d WHERE d.kind='REVIEW_SCHEMA' AND d.code="ReviewSchemaVersion".name AND d.version="ReviewSchemaVersion".version AND d.status IN('APPROVED','PUBLISHED'))) WITH CHECK(p4_admin());
CREATE POLICY p12r1_dimension_insert ON "ReviewDimension" FOR INSERT TO ghidai_app WITH CHECK(p4_admin() AND EXISTS(SELECT 1 FROM "ReviewSchemaVersion" s JOIN "RemediationDraft" d ON d.code=s.name AND d.version=s.version AND d.kind='REVIEW_SCHEMA' WHERE s.id="schemaId" AND s.status='DRAFT' AND d.status='APPROVED'));
CREATE POLICY p12r1_option_insert ON "ReviewOption" FOR INSERT TO ghidai_app WITH CHECK(p4_admin() AND EXISTS(SELECT 1 FROM "ReviewDimension" x JOIN "ReviewSchemaVersion" s ON s.id=x."schemaId" JOIN "RemediationDraft" d ON d.code=s.name AND d.version=s.version AND d.kind='REVIEW_SCHEMA' WHERE x.id="dimensionId" AND s.status='DRAFT' AND d.status='APPROVED'));
CREATE FUNCTION p12r1_schema_matches(sid uuid,doc jsonb) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
BEGIN RETURN jsonb_array_length(doc->'dimensions')>0 AND (SELECT count(*) FROM "ReviewDimension" WHERE "schemaId"=sid)=jsonb_array_length(doc->'dimensions') AND NOT EXISTS(SELECT 1 FROM "ReviewDimension" x WHERE x."schemaId"=sid AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'dimensions') WITH ORDINALITY AS a(value,n) WHERE value->>'key'=x.key AND value->>'label'=x.label AND n-1=x."order" AND jsonb_array_length(value->'options')=(SELECT count(*) FROM "ReviewOption" WHERE "dimensionId"=x.id) AND NOT EXISTS(SELECT 1 FROM "ReviewOption" o WHERE o."dimensionId"=x.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(value->'options') opt WHERE (opt->>'value')::integer=o.value AND opt->>'label'=o.label))));END
$$;
REVOKE ALL ON FUNCTION p12r1_schema_matches(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p12r1_schema_matches(uuid,jsonb) TO ghidai_app;
CREATE FUNCTION p12r1_reviewed_graph_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d "RemediationDraft"; s "ReviewSchemaVersion"; x "ReviewDimension";
BEGIN
 IF current_user<>'ghidai_app' THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='AchievementRuleVersion' THEN
  SELECT * INTO d FROM "RemediationDraft" WHERE kind='RULE' AND code=NEW.code AND version=NEW.version AND status IN('APPROVED','PUBLISHED');
  IF d.id IS NULL OR NEW.type<>d.document->>'type' OR NEW.config<>d.document->'config' OR NEW."contentRevisionId"<>(d.document->>'contentRevisionId')::uuid OR NEW.status='PUBLISHED' AND (NOT p12r1_valid_reviewer(d."reviewerId") OR NOT EXISTS(SELECT 1 FROM "ContentRevision" c WHERE c.id=NEW."contentRevisionId" AND c.status='APPROVED' AND c."syntheticOnly")) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVIEWED_GRAPH_REQUIRED'; END IF;
 ELSIF TG_TABLE_NAME='ReviewSchemaVersion' THEN
  SELECT * INTO d FROM "RemediationDraft" WHERE kind='REVIEW_SCHEMA' AND code=NEW.name AND version=NEW.version AND status IN('APPROVED','PUBLISHED');
  IF d.id IS NULL OR TG_OP='INSERT' AND NEW.status<>'DRAFT' OR TG_OP='UPDATE' AND (NEW.name<>OLD.name OR NEW.version<>OLD.version) OR NEW.status='PUBLISHED' AND (NOT p12r1_schema_matches(NEW.id,d.document) OR NOT p12r1_valid_reviewer(d."reviewerId")) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVIEWED_GRAPH_REQUIRED'; END IF;
 ELSIF TG_TABLE_NAME='ReviewDimension' THEN
  SELECT * INTO s FROM "ReviewSchemaVersion" WHERE id=NEW."schemaId";SELECT * INTO d FROM "RemediationDraft" WHERE kind='REVIEW_SCHEMA' AND code=s.name AND version=s.version AND status='APPROVED';
  IF d.id IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(d.document->'dimensions') WITH ORDINALITY AS a(value,n) WHERE value->>'key'=NEW.key AND value->>'label'=NEW.label AND n-1=NEW."order") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVIEWED_GRAPH_REQUIRED'; END IF;
 ELSE
  SELECT * INTO x FROM "ReviewDimension" WHERE id=NEW."dimensionId";SELECT * INTO s FROM "ReviewSchemaVersion" WHERE id=x."schemaId";SELECT * INTO d FROM "RemediationDraft" WHERE kind='REVIEW_SCHEMA' AND code=s.name AND version=s.version AND status='APPROVED';
  IF d.id IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(d.document->'dimensions') a CROSS JOIN LATERAL jsonb_array_elements(a->'options') opt WHERE a->>'key'=x.key AND (opt->>'value')::integer=NEW.value AND opt->>'label'=NEW.label) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVIEWED_GRAPH_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p12r1_reviewed_graph_guard BEFORE INSERT OR UPDATE ON "AchievementRuleVersion" FOR EACH ROW EXECUTE FUNCTION p12r1_reviewed_graph_guard();
CREATE TRIGGER p12r1_reviewed_graph_guard BEFORE INSERT OR UPDATE ON "ReviewSchemaVersion" FOR EACH ROW EXECUTE FUNCTION p12r1_reviewed_graph_guard();
CREATE TRIGGER p12r1_reviewed_graph_guard BEFORE INSERT ON "ReviewDimension" FOR EACH ROW EXECUTE FUNCTION p12r1_reviewed_graph_guard();
CREATE TRIGGER p12r1_reviewed_graph_guard BEFORE INSERT ON "ReviewOption" FOR EACH ROW EXECUTE FUNCTION p12r1_reviewed_graph_guard();
REVOKE ALL ON FUNCTION p12r1_reviewed_graph_guard() FROM PUBLIC;
-- Permit only status withdrawal of immutable published definitions; content and version stay frozen.
CREATE OR REPLACE FUNCTION schema_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status IN('PUBLISHED','WITHDRAWN') THEN
  IF TG_OP='UPDATE' AND OLD.status='PUBLISHED' AND NEW.status='WITHDRAWN' AND p4_admin() AND (to_jsonb(NEW)-'status'-'revision'-'updatedAt')=(to_jsonb(OLD)-'status'-'revision'-'updatedAt') THEN RETURN NEW; END IF;
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_VERSION';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE UNIQUE INDEX p12r1_one_pending_correction ON "CorrectionRequest"("userId","recordId") WHERE status='PENDING';
CREATE FUNCTION p12r1_correction_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_user<>'ghidai_app' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN IF NEW.status='PENDING' AND NEW."reviewedBy" IS NULL AND NEW."reviewedAt" IS NULL THEN RETURN NEW; END IF;
 ELSE IF OLD.status='PENDING' AND NEW.status='CANCELLED' AND (to_jsonb(NEW)-'status'-'revision'-'updatedAt')=(to_jsonb(OLD)-'status'-'revision'-'updatedAt') THEN RETURN NEW; END IF; END IF;
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='CORRECTION_POLICY_NOT_APPROVED';
END $$;
CREATE TRIGGER p12r1_correction_guard BEFORE INSERT OR UPDATE ON "CorrectionRequest" FOR EACH ROW EXECUTE FUNCTION p12r1_correction_guard();
REVOKE ALL ON FUNCTION p12r1_draft_guard(),p12r1_correction_guard() FROM PUBLIC;
RESET ROLE;
COMMIT;
