BEGIN;
SET ROLE ghidai_owner;
CREATE POLICY p7_link_read ON "ProgramAchievementRule" FOR SELECT TO ghidai_app USING(active_actor() AND p5_joined_version("versionId"));
CREATE POLICY p7_rule_read ON "AchievementRuleVersion" FOR SELECT TO ghidai_app USING(active_actor() AND EXISTS(SELECT 1 FROM "ProgramAchievementRule" l WHERE l."ruleVersionId"="AchievementRuleVersion".id AND p5_joined_version(l."versionId")));
CREATE POLICY p7_withdrawal_read ON "ProgramWithdrawal" FOR SELECT TO ghidai_app USING(active_actor() AND p5_joined_version("versionId"));
CREATE POLICY p7_award_insert ON "AchievementAward" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY p7_award_update ON "AchievementAward" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY p7_cert_insert ON "Certificate" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY p7_cert_update ON "Certificate" FOR UPDATE TO ghidai_app USING(active_actor() AND "userId"=actor_id()) WITH CHECK(active_actor() AND "userId"=actor_id());
CREATE POLICY p7_audit_insert ON "AuditLog" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "actorId"=actor_id() AND action IN ('SYNTHETIC_AWARD_GRANTED','SYNTHETIC_AWARD_REVOKED'));

CREATE FUNCTION p7_rule_eligible(uid uuid,eid uuid,rid uuid) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE e "Enrollment"; r "AchievementRuleVersion"; p "PolicyVersion"; today date; n integer; c integer; run integer=0; longest integer=0; first_day boolean=false; day_row record;
BEGIN
 SELECT * INTO e FROM "Enrollment" WHERE id=eid AND "userId"=uid;
 SELECT * INTO r FROM "AchievementRuleVersion" WHERE id=rid;
 SELECT * INTO p FROM "PolicyVersion" WHERE id=e."policyVersionId";
 IF e.id IS NULL OR current_database() NOT IN ('ghidai_development','ghidai_test') OR e.status='WITHDRAWN' OR r.status<>'PUBLISHED' OR p."streakRule"->>'syntheticOnly' IS DISTINCT FROM 'true' OR r.config->>'syntheticOnly' IS DISTINCT FROM 'true' OR NOT p4_visible_version(e."versionId") OR NOT EXISTS(SELECT 1 FROM "ContentRevision" WHERE id=r."contentRevisionId" AND status='APPROVED' AND "syntheticOnly") THEN RETURN false; END IF;
 today=(now() AT TIME ZONE e."timezoneSnapshot")::date;
 IF jsonb_typeof(r.config)<>'object' THEN RETURN false; END IF;
 IF r.type='STREAK' AND (jsonb_typeof(r.config->'days') IS DISTINCT FROM 'number' OR (r.config->>'days')::numeric<1 OR (r.config->>'days')::numeric>366 OR trunc((r.config->>'days')::numeric)<>(r.config->>'days')::numeric) THEN RETURN false; END IF;
 IF r.type='COMPLETION' AND (jsonb_typeof(r.config->'percentage') IS DISTINCT FROM 'number' OR (r.config->>'percentage')::numeric<0 OR (r.config->>'percentage')::numeric>100) THEN RETURN false; END IF;
 n=0;c=0;
 FOR day_row IN SELECT d."localDate",count(o.id) FILTER(WHERE o."requiredSnapshot" AND x.id IS NULL AND d.state<>'EXCLUDED') required,count(o.id) FILTER(WHERE o."requiredSnapshot" AND x.id IS NULL AND d.state<>'EXCLUDED' AND done.id IS NOT NULL) completed FROM "EnrollmentDay" d LEFT JOIN "TaskOccurrence" o ON o."dayId"=d.id LEFT JOIN "TaskCompletion" done ON done."occurrenceId"=o.id LEFT JOIN "TaskExclusion" x ON x."occurrenceId"=o.id WHERE d."enrollmentId"=eid GROUP BY d.id ORDER BY d."localDate" LOOP
  n=n+day_row.required;c=c+day_row.completed;
  IF day_row."localDate"<=today AND day_row.required>0 THEN IF day_row.completed=day_row.required THEN first_day=true;run=run+1;longest=greatest(longest,run);ELSE run=0;END IF; END IF;
 END LOOP;
 IF r.type='FIRST_DAY' THEN RETURN first_day;
 ELSIF r.type='STREAK' THEN RETURN (r.config->>'days')::integer>0 AND longest>=(r.config->>'days')::integer;
 ELSIF r.type='COMPLETION' THEN RETURN n>0 AND (SELECT max("localDate") FROM "EnrollmentDay" WHERE "enrollmentId"=eid)<today AND round(100.0*c/n,1)>=(r.config->>'percentage')::numeric;
 END IF;
 RETURN false;
END $$;
CREATE FUNCTION p7_award_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e "Enrollment"; n integer; c integer; actual numeric;
BEGIN
 SELECT * INTO e FROM "Enrollment" WHERE id=NEW."enrollmentId" AND "userId"=NEW."userId" FOR UPDATE;
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW."userId"<>OLD."userId" OR NEW."enrollmentId"<>OLD."enrollmentId" OR NEW."ruleVersionId"<>OLD."ruleVersionId") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_AWARD_IDENTITY'; END IF;
 SELECT count(o.id),count(done.id) INTO n,c FROM "EnrollmentDay" d JOIN "TaskOccurrence" o ON o."dayId"=d.id LEFT JOIN "TaskCompletion" done ON done."occurrenceId"=o.id WHERE d."enrollmentId"=e.id AND d.state<>'EXCLUDED' AND o."requiredSnapshot" AND NOT EXISTS(SELECT 1 FROM "TaskExclusion" x WHERE x."occurrenceId"=o.id);
 actual=CASE WHEN n=0 THEN NULL ELSE round(100.0*c/n,1) END;
 IF e.id IS NULL OR NEW."aggregateRevision"<>e.revision OR NEW.evidence->>'syntheticOnly' IS DISTINCT FROM 'true' OR (NEW.evidence->>'sourceRevision')::integer IS DISTINCT FROM e.revision OR (NEW.status='GRANTED' AND ((NEW.evidence->>'percentage')::numeric IS DISTINCT FROM actual OR NOT p7_rule_eligible(NEW."userId",NEW."enrollmentId",NEW."ruleVersionId"))) OR (NEW.status='REVOKED') IS DISTINCT FROM (NEW."revokedAt" IS NOT NULL) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='AWARD_SOURCE_GATE'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION p7_certificate_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a "AchievementAward"; e "Enrollment"; p "PolicyVersion"; r "AchievementRuleVersion";
BEGIN
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW."userId"<>OLD."userId" OR NEW."awardId"<>OLD."awardId" OR NEW.serial<>OLD.serial OR NEW."issuedAt"<>OLD."issuedAt") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_CERTIFICATE_IDENTITY'; END IF;
 SELECT * INTO a FROM "AchievementAward" WHERE id=NEW."awardId" AND "userId"=NEW."userId";
 SELECT * INTO e FROM "Enrollment" WHERE id=a."enrollmentId" AND "userId"=NEW."userId";
 SELECT * INTO p FROM "PolicyVersion" WHERE id=e."policyVersionId";
 SELECT * INTO r FROM "AchievementRuleVersion" WHERE id=a."ruleVersionId";
 IF NEW.status='VALID' AND (NEW.serial NOT LIKE 'TEST-%' OR a.status<>'GRANTED' OR a."aggregateRevision"<>e.revision OR r.type<>'COMPLETION' OR NOT p7_rule_eligible(NEW."userId",e.id,r.id) OR (a.evidence->>'percentage')::numeric<p."certificateThreshold") THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='CERTIFICATE_SOURCE_GATE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p7_award_guard BEFORE INSERT OR UPDATE ON "AchievementAward" FOR EACH ROW EXECUTE FUNCTION p7_award_guard();
CREATE TRIGGER p7_certificate_guard BEFORE INSERT OR UPDATE ON "Certificate" FOR EACH ROW EXECUTE FUNCTION p7_certificate_guard();
REVOKE ALL ON FUNCTION p7_rule_eligible(uuid,uuid,uuid),p7_award_guard(),p7_certificate_guard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p7_rule_eligible(uuid,uuid,uuid) TO ghidai_app;
-- Historical synthetic fixtures require a superuser, a preserved isolated test schema,
-- and an explicit transaction-local switch. No API/app role can enable this gate.
CREATE OR REPLACE FUNCTION p5_enrollment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v "ProgramVersion"; p "PolicyVersion"; zone text; today date;
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT * INTO v FROM "ProgramVersion" WHERE id=NEW."versionId";
  SELECT * INTO p FROM "PolicyVersion" WHERE id=NEW."policyVersionId";
  SELECT timezone INTO zone FROM "Profile" WHERE "userId"=NEW."userId";
  today=(now() AT TIME ZONE NEW."timezoneSnapshot")::date;
  IF current_database() NOT IN ('ghidai_development','ghidai_test') OR NOT p5_lock_join_version(NEW."versionId",NEW."programId") OR NOT EXISTS(SELECT 1 FROM "Program" WHERE id=NEW."programId" AND status='ACTIVE') OR p."streakRule"->>'syntheticOnly' IS DISTINCT FROM 'true' OR zone IS DISTINCT FROM NEW."timezoneSnapshot" OR (NEW."startDate"<today AND NOT (current_database()='ghidai_test' AND current_schema() ~ '^p3_test_[0-9]+$' AND EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) AND coalesce(current_setting('ghidai.synthetic_history_fixture',true),'off')='on')) OR (v."startMode"='FIXED' AND NEW."startDate" IS DISTINCT FROM v."fixedStartDate") OR NEW.status NOT IN ('SCHEDULED','ACTIVE') OR (NEW.status='ACTIVE') IS DISTINCT FROM (NEW."startDate"<=today) OR NEW."withdrawnAt" IS NOT NULL THEN
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
RESET ROLE;
COMMIT;
