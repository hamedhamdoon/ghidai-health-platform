BEGIN;
SET ROLE ghidai_owner;
DROP POLICY self_delete ON "UserGoal";
CREATE POLICY self_delete ON "UserGoal" FOR DELETE TO ghidai_app USING(
 active_actor() AND "userId"=actor_id() AND "effectiveDate">(
 SELECT (now() AT TIME ZONE timezone)::date FROM "Profile" WHERE "userId"=actor_id()
 ));
RESET ROLE;
COMMIT;
