BEGIN;
SET ROLE ghidai_owner;
ALTER TABLE "AccessGrant" DROP CONSTRAINT "AccessGrant_resource_check";
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_resource_check" CHECK(resource IN('WaterLog','StepDayLog','ExerciseLog','SleepLog','DailyReview','CoachNote','Progress'));
RESET ROLE;
CREATE OR REPLACE FUNCTION can_read(subject uuid, resource_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
SELECT EXISTS (SELECT 1 FROM "User" u JOIN "AccessGrant" g ON g."subjectId"=u.id JOIN "CoachAssignment" a ON a.id=g."assignmentId" JOIN "Consent" c ON c.id=g."consentId" JOIN "User" participant ON participant.id=g."scopeUserId" WHERE u.id=actor_id() AND u.role='COACH' AND u.status='ACTIVE' AND participant.status='ACTIVE' AND g."scopeUserId"=subject AND g.resource=resource_name AND g.action='READ' AND g."revokedAt" IS NULL AND now()>=g."startsAt" AND now()<g."expiresAt" AND a."revokedAt" IS NULL AND now()>=a."startsAt" AND now()<a."expiresAt" AND c.kind='COACH' AND c."revokedAt" IS NULL AND now()>=c."grantedAt" AND now()<c."expiresAt" AND c.scope @> jsonb_build_object('resources',jsonb_build_array(resource_name),'actions',jsonb_build_array('READ')) AND (c."policyVersion"<>'synthetic-local-p8-v1' OR EXISTS(SELECT 1 FROM "P4LocalCapability" cap WHERE cap."userId"=u.id AND cap."expiresAt">now() AND current_database() IN('ghidai_development','ghidai_test')))) $$;
ALTER FUNCTION can_read(uuid,text) OWNER TO ghidai_policy;
SET ROLE ghidai_owner;
CREATE FUNCTION p8_staff() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN RETURN p4_staff() AND EXISTS(SELECT 1 FROM "User" WHERE id=actor_id() AND role='COACH'); END $$;
CREATE FUNCTION p8_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT p4_admin() $$;
CREATE FUNCTION p8_users() RETURNS TABLE(id uuid,role text,status text,revision integer) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN
 IF NOT p8_admin() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='FORBIDDEN'; END IF;
 RETURN QUERY SELECT u.id,u.role::text,u.status::text,u.revision FROM "User" u WHERE u."emailNormalized" LIKE '%@ghidai.test' ORDER BY u.id LIMIT 100;
END $$;
CREATE FUNCTION p8_update_user(target uuid,new_role text,new_status text,expected integer) RETURNS TABLE(id uuid,role text,status text,revision integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ DECLARE oldrow "User"; BEGIN
 IF NOT p8_admin() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='FORBIDDEN'; END IF;
 IF new_role NOT IN('USER','COACH','ADMIN') OR new_status NOT IN('ACTIVE','SUSPENDED') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='VALIDATION_FAILED'; END IF;
 PERFORM pg_advisory_xact_lock(813001);
 SELECT * INTO oldrow FROM "User" u WHERE u.id=target AND u."emailNormalized" LIKE '%@ghidai.test' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='NOT_FOUND'; END IF;
 IF oldrow.revision<>expected THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVISION_CONFLICT'; END IF;
 IF oldrow.role='ADMIN' AND oldrow.status='ACTIVE' AND (new_role<>'ADMIN' OR new_status<>'ACTIVE') AND NOT EXISTS(SELECT 1 FROM "User" u WHERE u.id<>target AND u.role='ADMIN' AND u.status='ACTIVE') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='LAST_ADMIN_PROTECTED'; END IF;
 UPDATE "User" u SET role=new_role::"Role",status=new_status::"UserStatus",revision=u.revision+1,"updatedAt"=now() WHERE u.id=target;
 UPDATE "Session" SET "revokedAt"=now(),revision="Session".revision+1 WHERE "userId"=target AND "revokedAt" IS NULL;
 IF new_role<>'COACH' OR new_status<>'ACTIVE' THEN
  UPDATE "CoachAssignment" SET "revokedAt"=now(),revision="CoachAssignment".revision+1 WHERE ("coachId"=target OR (new_status<>'ACTIVE' AND "userId"=target)) AND "revokedAt" IS NULL;
  UPDATE "AccessGrant" SET "revokedAt"=now(),revision="AccessGrant".revision+1 WHERE ("subjectId"=target OR (new_status<>'ACTIVE' AND "scopeUserId"=target)) AND "revokedAt" IS NULL;
 END IF;
 INSERT INTO "AuditLog"("actorId",action,"targetType","targetId","requestId","occurredAt") VALUES(actor_id(),'P8_USER_UPDATED','User',target,gen_random_uuid(),now());
 RETURN QUERY SELECT u.id,u.role::text,u.status::text,u.revision FROM "User" u WHERE u.id=target;
END $$;
CREATE FUNCTION p8_grant_assignment(coach uuid,resources text[],expires timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ DECLARE cid uuid; aid uuid; resource_name text; BEGIN
 IF NOT active_actor() OR current_database() NOT IN('ghidai_development','ghidai_test') OR NOT EXISTS(SELECT 1 FROM "User" WHERE id=actor_id() AND "emailNormalized" LIKE '%@ghidai.test') OR NOT EXISTS(SELECT 1 FROM "User" u JOIN "P4LocalCapability" cap ON cap."userId"=u.id WHERE u.id=coach AND u.role='COACH' AND u.status='ACTIVE' AND cap."expiresAt">now() AND u."emailNormalized" LIKE '%@ghidai.test') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='FORBIDDEN'; END IF;
 IF coach=actor_id() OR expires<=now() OR expires>now()+interval '30 days' OR cardinality(resources) NOT BETWEEN 1 AND 6 OR EXISTS(SELECT 1 FROM unnest(resources) r WHERE r IS NULL OR r NOT IN('Progress','CoachNote','WaterLog','StepDayLog','ExerciseLog','SleepLog')) OR (SELECT count(DISTINCT r) FROM unnest(resources) r)<>cardinality(resources) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INVALID_SCOPE'; END IF;
 INSERT INTO "Consent"("userId",kind,"policyVersion","scopeKey",scope,"grantedAt","expiresAt") VALUES(actor_id(),'COACH','synthetic-local-p8-v1',coach::text,jsonb_build_object('localSynthetic',true,'coachId',coach,'resources',to_jsonb(resources),'actions',jsonb_build_array('READ')),now(),expires) RETURNING id INTO cid;
 INSERT INTO "CoachAssignment"("userId","coachId","consentId","startsAt","expiresAt") VALUES(actor_id(),coach,cid,now(),expires) RETURNING id INTO aid;
 FOREACH resource_name IN ARRAY resources LOOP
 INSERT INTO "AccessGrant"("subjectId","scopeUserId",resource,action,"assignmentId","consentId","startsAt","expiresAt",reason,"grantedBy") VALUES(coach,actor_id(),resource_name,'READ',aid,cid,now(),expires,'Explicit synthetic participant consent',actor_id());
 END LOOP;
 RETURN jsonb_build_object('id',aid,'consentId',cid,'coachId',coach,'resources',resources,'expiresAt',expires,'revision',1,'syntheticOnly',true);
END $$;
CREATE FUNCTION p8_revoke_assignment(target uuid,expected integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ DECLARE assignment "CoachAssignment"; BEGIN
 IF NOT active_actor() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='FORBIDDEN'; END IF;
 SELECT * INTO assignment FROM "CoachAssignment" a WHERE a.id=target AND (a."userId"=actor_id() OR p8_admin()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='NOT_FOUND'; END IF;
 IF assignment.revision<>expected OR assignment."revokedAt" IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='REVISION_CONFLICT'; END IF;
 UPDATE "Consent" SET "revokedAt"=now(),revision=revision+1 WHERE id=assignment."consentId" AND "revokedAt" IS NULL;
 UPDATE "AccessGrant" SET "revokedAt"=now(),revision=revision+1 WHERE "assignmentId"=target AND "revokedAt" IS NULL;
 UPDATE "CoachAssignment" SET "revokedAt"=now(),revision=revision+1 WHERE "CoachAssignment".id=target;
 RETURN jsonb_build_object('id',target,'revision',expected+1,'revoked',true);
END $$;
CREATE FUNCTION p8_assignments() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN
 IF NOT p8_admin() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='FORBIDDEN'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM (SELECT id,"userId","coachId","consentId","startsAt","expiresAt","revokedAt",revision FROM "CoachAssignment" ORDER BY "createdAt" DESC LIMIT 100) a),'[]'); END $$;
CREATE FUNCTION p8_operations() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN
 IF NOT p8_admin() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='FORBIDDEN'; END IF;
 RETURN jsonb_build_object('programs',(SELECT count(*) FROM "Program"),'versions',(SELECT count(*) FROM "ProgramVersion"),'pendingContent',(SELECT count(*) FROM "ContentRevision" WHERE status='IN_REVIEW'),'syntheticOnly',true,'healthReportsAvailable',false); END $$;
CREATE FUNCTION p8_audit() RETURNS TABLE(id uuid,"actorId" uuid,action text,"targetType" text,"targetId" uuid,"occurredAt" timestamptz,reason text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN
 IF NOT p8_admin() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='FORBIDDEN'; END IF;
 RETURN QUERY SELECT a.id,a."actorId",a.action,a."targetType",a."targetId",a."occurredAt",a.reason::text FROM "AuditLog" a ORDER BY a."occurredAt" DESC LIMIT 100; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['Enrollment','EnrollmentDay','TaskOccurrence','TaskCompletion','TaskExclusion'] LOOP
 EXECUTE format('CREATE POLICY p8_progress_read ON %I FOR SELECT TO ghidai_app USING(p8_staff() AND can_read("userId",''Progress''))',t);
END LOOP; END $$;
CREATE POLICY p8_coach_assignment ON "CoachAssignment" FOR SELECT TO ghidai_app USING(p8_staff() AND "coachId"=actor_id() AND "revokedAt" IS NULL AND "startsAt"<=now() AND "expiresAt">now() AND EXISTS(SELECT 1 FROM unnest(ARRAY['Progress','CoachNote','WaterLog','StepDayLog','ExerciseLog','SleepLog']) r WHERE can_read("userId",r)));
CREATE POLICY p8_note_insert ON "CoachNote" FOR INSERT TO ghidai_app WITH CHECK(p8_staff() AND "coachId"=actor_id() AND can_read("userId",'CoachNote') AND EXISTS(SELECT 1 FROM "CoachAssignment" a WHERE a.id="assignmentId" AND a."consentId"="CoachNote"."consentId"));
CREATE POLICY p8_grant_read ON "AccessGrant" FOR SELECT TO ghidai_app USING(active_actor() AND ("scopeUserId"=actor_id() OR (p8_staff() AND "subjectId"=actor_id() AND can_read("scopeUserId",resource))));
CREATE FUNCTION p8_consent_visible(cid uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN RETURN p8_staff() AND EXISTS(SELECT 1 FROM "CoachAssignment" a JOIN "Consent" c ON c.id=a."consentId" WHERE a."consentId"=cid AND a."coachId"=actor_id() AND a."revokedAt" IS NULL AND a."startsAt"<=now() AND a."expiresAt">now() AND c."revokedAt" IS NULL AND c."grantedAt"<=now() AND c."expiresAt">now()); END $$;
CREATE POLICY p8_coach_consent ON "Consent" FOR SELECT TO ghidai_app USING(p8_consent_visible(id));
GRANT SELECT ON "AccessGrant" TO ghidai_app;
CREATE POLICY p8_audit_insert ON "AuditLog" FOR INSERT TO ghidai_app WITH CHECK(active_actor() AND "actorId"=actor_id() AND action LIKE 'P8_%');
RESET ROLE;
GRANT SELECT,INSERT,UPDATE ON "Consent","CoachAssignment","AccessGrant" TO ghidai_policy;
GRANT UPDATE ON "User","Session" TO ghidai_policy;
GRANT SELECT ON "Session","AuditLog" TO ghidai_policy;
ALTER FUNCTION p8_staff() OWNER TO ghidai_policy;
ALTER FUNCTION p8_consent_visible(uuid) OWNER TO ghidai_policy;
REVOKE ALL ON FUNCTION p8_consent_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p8_consent_visible(uuid) TO ghidai_app,ghidai_policy;
ALTER FUNCTION p8_users() OWNER TO ghidai_policy;
ALTER FUNCTION p8_update_user(uuid,text,text,integer) OWNER TO ghidai_policy;
ALTER FUNCTION p8_grant_assignment(uuid,text[],timestamptz) OWNER TO ghidai_policy;
ALTER FUNCTION p8_revoke_assignment(uuid,integer) OWNER TO ghidai_policy;
ALTER FUNCTION p8_assignments() OWNER TO ghidai_policy;
ALTER FUNCTION p8_operations() OWNER TO ghidai_policy;
ALTER FUNCTION p8_audit() OWNER TO ghidai_policy;
REVOKE ALL ON FUNCTION p8_staff(),p8_admin(),p8_users(),p8_update_user(uuid,text,text,integer),p8_grant_assignment(uuid,text[],timestamptz),p8_revoke_assignment(uuid,integer),p8_assignments(),p8_operations(),p8_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p8_staff(),p8_admin(),p8_users(),p8_update_user(uuid,text,text,integer),p8_grant_assignment(uuid,text[],timestamptz),p8_revoke_assignment(uuid,integer),p8_assignments(),p8_operations(),p8_audit() TO ghidai_app,ghidai_policy;
COMMIT;
