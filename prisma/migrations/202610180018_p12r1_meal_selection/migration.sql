BEGIN;
SET ROLE ghidai_owner;
GRANT INSERT,UPDATE ON "MealSelection" TO ghidai_app;
CREATE FUNCTION p12r1_plan_visible(pid uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
 BEGIN RETURN active_actor() AND EXISTS(SELECT 1 FROM "ProgramNutritionPlan" l JOIN "Enrollment" e ON e."versionId"=l."versionId" WHERE l."planId"=pid AND e."userId"=actor_id() AND p4_visible_version(e."versionId")); END
$$;
CREATE FUNCTION p12r1_meal_visible(mid uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
 BEGIN RETURN active_actor() AND EXISTS(SELECT 1 FROM "PlanMeal" p JOIN "Meal" m ON m."contentRevisionId"=p."mealRevisionId" OR m.id IN(SELECT "alternativeMealId" FROM "MealAlternative" WHERE "planMealId"=p.id) WHERE m.id=mid AND p12r1_plan_visible(p."planId")); END
$$;
CREATE FUNCTION p12r1_lock_nutrition(vid uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$
BEGIN
 IF NOT active_actor() OR NOT p5_joined_version(vid) THEN RETURN false; END IF;
 PERFORM id FROM "ProgramVersion" WHERE id=vid FOR SHARE;
 PERFORM c.id FROM "ContentRevision" c WHERE c.id IN(SELECT n."contentRevisionId" FROM "NutritionPlan" n JOIN "ProgramNutritionPlan" l ON l."planId"=n.id WHERE l."versionId"=vid UNION SELECT p."mealRevisionId" FROM "PlanMeal" p JOIN "ProgramNutritionPlan" l ON l."planId"=p."planId" WHERE l."versionId"=vid UNION SELECT a."approvalRevisionId" FROM "MealAlternative" a JOIN "PlanMeal" p ON p.id=a."planMealId" JOIN "ProgramNutritionPlan" l ON l."planId"=p."planId" WHERE l."versionId"=vid) ORDER BY c.id FOR SHARE;
 RETURN p4_visible_version(vid);
END $$;
RESET ROLE;
GRANT SELECT,UPDATE ON "ContentRevision" TO ghidai_policy;
ALTER FUNCTION p12r1_plan_visible(uuid) OWNER TO ghidai_policy;
ALTER FUNCTION p12r1_meal_visible(uuid) OWNER TO ghidai_policy;
ALTER FUNCTION p12r1_lock_nutrition(uuid) OWNER TO ghidai_policy;
REVOKE ALL ON FUNCTION p12r1_plan_visible(uuid),p12r1_meal_visible(uuid),p12r1_lock_nutrition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p12r1_plan_visible(uuid),p12r1_meal_visible(uuid),p12r1_lock_nutrition(uuid) TO ghidai_app,ghidai_policy;
GRANT EXECUTE ON FUNCTION p5_joined_version(uuid) TO ghidai_policy;
SET ROLE ghidai_owner;
CREATE POLICY p12r1_read ON "NutritionPlan" FOR SELECT TO ghidai_app USING(p12r1_plan_visible(id));
CREATE POLICY p12r1_read ON "PlanMeal" FOR SELECT TO ghidai_app USING(p12r1_plan_visible("planId"));
CREATE POLICY p12r1_read ON "MealAlternative" FOR SELECT TO ghidai_app USING(EXISTS(SELECT 1 FROM "PlanMeal" p WHERE p.id="planMealId" AND p12r1_plan_visible(p."planId")));
CREATE POLICY p12r1_read ON "Meal" FOR SELECT TO ghidai_app USING(p12r1_meal_visible(id));
CREATE POLICY p12r1_read ON "MealIngredient" FOR SELECT TO ghidai_app USING(p12r1_meal_visible("mealId"));
CREATE POLICY p12r1_read ON "Ingredient" FOR SELECT TO ghidai_app USING(EXISTS(SELECT 1 FROM "MealIngredient" mi WHERE mi."ingredientId"="Ingredient".id AND p12r1_meal_visible(mi."mealId")));
-- Defense in depth: a direct application-role write must satisfy the same
-- enrolled version, synthetic publication, exclusion and correction window gates.
CREATE FUNCTION p12r1_selection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d "EnrollmentDay"; e "Enrollment"; p "PolicyVersion";
BEGIN
 SELECT ed.* INTO d FROM "EnrollmentDay" ed JOIN "TaskOccurrence" o ON o."dayId"=ed.id WHERE o.id=NEW."occurrenceId" AND o."userId"=NEW."userId";
 SELECT * INTO e FROM "Enrollment" WHERE id=d."enrollmentId";
 SELECT * INTO p FROM "PolicyVersion" WHERE id=e."policyVersionId";
 IF e.id IS NULL OR current_database() NOT IN ('ghidai_development','ghidai_test') OR p."streakRule"->>'syntheticOnly' IS DISTINCT FROM 'true' OR NOT p4_visible_version(e."versionId") OR d.state<>'OPEN' OR e.status<>'ACTIVE' OR d."localDate">(now() AT TIME ZONE e."timezoneSnapshot")::date OR d."localDate"+p."lateWindowDays"<(now() AT TIME ZONE e."timezoneSnapshot")::date OR EXISTS(SELECT 1 FROM "TaskExclusion" WHERE "occurrenceId"=NEW."occurrenceId") OR NOT EXISTS(SELECT 1 FROM "PlanMeal" pm JOIN "ProgramNutritionPlan" n ON n."planId"=pm."planId" WHERE pm.id=NEW."planMealId" AND n."versionId"=e."versionId" AND pm."dayIndex"=d."dayIndex") THEN
 RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='MEAL_SELECTION_WINDOW_GATE'; END IF;
 IF TG_OP='UPDATE' AND (NEW."userId"<>OLD."userId" OR NEW."occurrenceId"<>OLD."occurrenceId" OR NEW."planMealId"<>OLD."planMealId" OR NEW.revision<>OLD.revision+1) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='MEAL_SELECTION_IMMUTABLE_SCOPE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER p12r1_selection_guard BEFORE INSERT OR UPDATE ON "MealSelection" FOR EACH ROW EXECUTE FUNCTION p12r1_selection_guard();
REVOKE ALL ON FUNCTION p12r1_selection_guard() FROM PUBLIC;
RESET ROLE;
COMMIT;
