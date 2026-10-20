BEGIN;
SET ROLE ghidai_owner;
-- Qualify reviewed JSON document aliases to avoid collision with ReviewOption.value.
CREATE OR REPLACE FUNCTION p12r1_draft_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
  IF NEW.kind='REVIEW_SCHEMA' AND EXISTS(SELECT 1 FROM "ReviewSchemaVersion" s WHERE s.id=NEW."publishedId" AND s.name=NEW.code AND s.version=NEW.version AND s.status='PUBLISHED') AND (SELECT count(*) FROM "ReviewDimension" WHERE "schemaId"=NEW."publishedId")=jsonb_array_length(NEW.document->'dimensions') AND NOT EXISTS(SELECT 1 FROM "ReviewDimension" x WHERE x."schemaId"=NEW."publishedId" AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.document->'dimensions') WITH ORDINALITY AS a(value,n) WHERE a.value->>'key'=x.key AND a.value->>'label'=x.label AND n-1=x."order" AND jsonb_array_length(a.value->'options')=(SELECT count(*) FROM "ReviewOption" WHERE "dimensionId"=x.id) AND NOT EXISTS(SELECT 1 FROM "ReviewOption" o WHERE o."dimensionId"=x.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a.value->'options') opt WHERE (opt->>'value')::integer=o.value AND opt->>'label'=o.label)))) THEN RETURN NEW; END IF;
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVIEWED_GRAPH_REQUIRED';
 END IF;
 IF p4_admin() AND OLD.status='PUBLISHED' AND NEW.status='WITHDRAWN' AND length(trim(NEW."withdrawReason"))>0 THEN RETURN NEW; END IF;
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='INVALID_AUTHORING_TRANSITION';
END $$;
CREATE OR REPLACE FUNCTION p12r1_schema_matches(sid uuid,doc jsonb) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
BEGIN RETURN jsonb_array_length(doc->'dimensions')>0 AND (SELECT count(*) FROM "ReviewDimension" WHERE "schemaId"=sid)=jsonb_array_length(doc->'dimensions') AND NOT EXISTS(SELECT 1 FROM "ReviewDimension" x WHERE x."schemaId"=sid AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'dimensions') WITH ORDINALITY AS a(value,n) WHERE a.value->>'key'=x.key AND a.value->>'label'=x.label AND n-1=x."order" AND jsonb_array_length(a.value->'options')=(SELECT count(*) FROM "ReviewOption" WHERE "dimensionId"=x.id) AND NOT EXISTS(SELECT 1 FROM "ReviewOption" o WHERE o."dimensionId"=x.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a.value->'options') opt WHERE (opt->>'value')::integer=o.value AND opt->>'label'=o.label))));END
$$;
CREATE POLICY p12r1_correction_audit ON "AuditLog" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "actorId"=actor_id() AND "targetType"='Remediation' AND action IN('P12R1_POST_corrections','P12R1_POST_cancel') AND "safeMetadata"='{}'::jsonb AND reason IS NULL AND EXISTS(SELECT 1 FROM "CorrectionRequest" c WHERE c.id="AuditLog"."targetId" AND c."userId"=actor_id()));
RESET ROLE;
COMMIT;

