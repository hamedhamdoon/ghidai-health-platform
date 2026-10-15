BEGIN;
-- READ and NOTE are independent actions. Existing consent is never expanded.
CREATE FUNCTION p8_can_note(subject uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN
 RETURN p8_staff() AND can_read(subject,'CoachNote') AND EXISTS(SELECT 1 FROM "AccessGrant" g JOIN "CoachAssignment" a ON a.id=g."assignmentId" JOIN "Consent" c ON c.id=g."consentId" WHERE g."subjectId"=actor_id() AND g."scopeUserId"=subject AND g.resource='CoachNote' AND g.action='NOTE' AND g."revokedAt" IS NULL AND g."startsAt"<=now() AND g."expiresAt">now() AND a."revokedAt" IS NULL AND a."startsAt"<=now() AND a."expiresAt">now() AND c.kind='COACH' AND c."revokedAt" IS NULL AND c."grantedAt"<=now() AND c."expiresAt">now() AND c.scope @> jsonb_build_object('resources',jsonb_build_array('CoachNote'),'actions',jsonb_build_array('NOTE')));
END $$;
ALTER FUNCTION p8_can_note(uuid) OWNER TO ghidai_policy;
REVOKE ALL ON FUNCTION p8_can_note(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p8_can_note(uuid) TO ghidai_app,ghidai_policy;
CREATE OR REPLACE FUNCTION can_read(subject uuid,resource_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
SELECT EXISTS(SELECT 1 FROM "User" u JOIN "AccessGrant" g ON g."subjectId"=u.id JOIN "CoachAssignment" a ON a.id=g."assignmentId" JOIN "Consent" c ON c.id=g."consentId" JOIN "User" participant ON participant.id=g."scopeUserId" WHERE u.id=actor_id() AND u.role='COACH' AND u.status='ACTIVE' AND participant.status='ACTIVE' AND g."scopeUserId"=subject AND g.resource=resource_name AND g.action='READ' AND g."revokedAt" IS NULL AND g."startsAt"<=now() AND g."expiresAt">now() AND a."revokedAt" IS NULL AND a."startsAt"<=now() AND a."expiresAt">now() AND c.kind='COACH' AND c."revokedAt" IS NULL AND c."grantedAt"<=now() AND c."expiresAt">now() AND c.scope @> jsonb_build_object('resources',jsonb_build_array(resource_name),'actions',jsonb_build_array('READ')) AND (c."policyVersion" NOT IN('synthetic-local-p8-v1','synthetic-local-p8-v2') OR EXISTS(SELECT 1 FROM "P4LocalCapability" cap WHERE cap."userId"=u.id AND cap."expiresAt">now() AND current_database() IN('ghidai_development','ghidai_test')))) $$;
DROP POLICY p8_note_insert ON "CoachNote";
CREATE FUNCTION p8_assignment_action(aid uuid,cid uuid,subject uuid,requested_action text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
 SELECT p8_staff() AND EXISTS(SELECT 1 FROM "CoachAssignment" a JOIN "Consent" c ON c.id=a."consentId" JOIN "AccessGrant" g ON g."assignmentId"=a.id AND g."consentId"=c.id WHERE a.id=aid AND c.id=cid AND a."userId"=subject AND c."userId"=subject AND a."coachId"=actor_id() AND g."subjectId"=actor_id() AND g."scopeUserId"=subject AND g.action::text=requested_action AND (requested_action='READ' OR (requested_action='NOTE' AND g.resource='CoachNote')) AND can_read(subject,g.resource) AND a."revokedAt" IS NULL AND a."startsAt"<=now() AND a."expiresAt">now() AND c.kind='COACH' AND c."revokedAt" IS NULL AND c."grantedAt"<=now() AND c."expiresAt">now() AND g."revokedAt" IS NULL AND g."startsAt"<=now() AND g."expiresAt">now() AND c.scope @> jsonb_build_object('resources',jsonb_build_array(g.resource),'actions',jsonb_build_array(requested_action)))
$$;
ALTER FUNCTION p8_assignment_action(uuid,uuid,uuid,text) OWNER TO ghidai_policy;
REVOKE ALL ON FUNCTION p8_assignment_action(uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p8_assignment_action(uuid,uuid,uuid,text) TO ghidai_app,ghidai_policy;
DROP POLICY p8_coach_assignment ON "CoachAssignment";
CREATE POLICY p8_coach_assignment ON "CoachAssignment" FOR SELECT TO ghidai_app USING(p8_assignment_action(id,"consentId","userId",'READ'));
CREATE POLICY p8_note_insert ON "CoachNote" FOR INSERT TO ghidai_app WITH CHECK("coachId"=actor_id() AND p8_assignment_action("assignmentId","consentId","userId",'NOTE'));
CREATE OR REPLACE FUNCTION p8_grant_assignment(coach uuid,resources text[],expires timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ DECLARE cid uuid;aid uuid;resource_name text;actions jsonb; BEGIN
 IF NOT active_actor() OR current_database() NOT IN('ghidai_development','ghidai_test') OR NOT EXISTS(SELECT 1 FROM "User" WHERE id=actor_id() AND "emailNormalized" LIKE '%@ghidai.test') OR NOT EXISTS(SELECT 1 FROM "User" u JOIN "P4LocalCapability" cap ON cap."userId"=u.id WHERE u.id=coach AND u.role='COACH' AND u.status='ACTIVE' AND cap."expiresAt">now() AND u."emailNormalized" LIKE '%@ghidai.test') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='FORBIDDEN'; END IF;
 IF coach=actor_id() OR expires<=now() OR expires>now()+interval '30 days' OR cardinality(resources) NOT BETWEEN 1 AND 6 OR EXISTS(SELECT 1 FROM unnest(resources) r WHERE r IS NULL OR r NOT IN('Progress','CoachNote','WaterLog','StepDayLog','ExerciseLog','SleepLog')) OR (SELECT count(DISTINCT r) FROM unnest(resources) r)<>cardinality(resources) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='INVALID_SCOPE'; END IF;
 actions=CASE WHEN 'CoachNote'=ANY(resources) THEN jsonb_build_array('READ','NOTE') ELSE jsonb_build_array('READ') END;
 INSERT INTO "Consent"("userId",kind,"policyVersion","scopeKey",scope,"grantedAt","expiresAt") VALUES(actor_id(),'COACH','synthetic-local-p8-v2',coach::text,jsonb_build_object('localSynthetic',true,'coachId',coach,'resources',to_jsonb(resources),'actions',actions),now(),expires) RETURNING id INTO cid;
 INSERT INTO "CoachAssignment"("userId","coachId","consentId","startsAt","expiresAt") VALUES(actor_id(),coach,cid,now(),expires) RETURNING id INTO aid;
 FOREACH resource_name IN ARRAY resources LOOP
 INSERT INTO "AccessGrant"("subjectId","scopeUserId",resource,action,"assignmentId","consentId","startsAt","expiresAt",reason,"grantedBy") VALUES(coach,actor_id(),resource_name,'READ',aid,cid,now(),expires,'Explicit synthetic participant read consent',actor_id());
 END LOOP;
 IF 'CoachNote'=ANY(resources) THEN INSERT INTO "AccessGrant"("subjectId","scopeUserId",resource,action,"assignmentId","consentId","startsAt","expiresAt",reason,"grantedBy") VALUES(coach,actor_id(),'CoachNote','NOTE',aid,cid,now(),expires,'Explicit synthetic participant note action consent',actor_id()); END IF;
 RETURN jsonb_build_object('id',aid,'consentId',cid,'coachId',coach,'resources',resources,'actions',actions,'expiresAt',expires,'revision',1,'syntheticOnly',true);
END $$;
COMMIT;
