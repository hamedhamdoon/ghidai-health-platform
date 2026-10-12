BEGIN;
SET ROLE ghidai_owner;
-- These qualification operations authorize synthetic local tests only. Real
-- bootstrap, credential verification and food publication remain owner gates.
GRANT INSERT,UPDATE ON "ReviewerQualification" TO ghidai_app;
CREATE POLICY p4_qualification_insert ON "ReviewerQualification" FOR INSERT TO ghidai_app WITH CHECK(p4_admin() AND "verifiedBy"=actor_id() AND "reviewerId"<>actor_id() AND "evidenceReference" LIKE 'synthetic-local:%' AND "validUntil">now() AND "validUntil"<=now()+interval '24 hours');
CREATE POLICY p4_qualification_update ON "ReviewerQualification" FOR UPDATE TO ghidai_app USING(p4_admin() AND "reviewerId"<>actor_id()) WITH CHECK(p4_admin() AND "reviewerId"<>actor_id() AND "evidenceReference" LIKE 'synthetic-local:%' AND "validUntil"<=now()+interval '24 hours');
GRANT DELETE ON "ProgramNutritionPlan" TO ghidai_app;
CREATE FUNCTION p4_nutrition_ready(vid uuid) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM "ProgramNutritionPlan" link JOIN "NutritionPlan" n ON n.id=link."planId" JOIN "ContentRevision" c ON c.id=n."contentRevisionId" WHERE link."versionId"=vid AND (c.status<>'APPROVED' OR NOT c."syntheticOnly")) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM "ProgramNutritionPlan" link JOIN "PlanMeal" p ON p."planId"=link."planId" JOIN "ContentRevision" c ON c.id=p."mealRevisionId" WHERE link."versionId"=vid AND (c.status<>'APPROVED' OR NOT c."syntheticOnly" OR p."dayIndex">(SELECT "durationDays" FROM "ProgramVersion" WHERE id=vid))) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM "ProgramNutritionPlan" link JOIN "PlanMeal" p ON p."planId"=link."planId" JOIN "MealAlternative" a ON a."planMealId"=p.id JOIN "ContentRevision" c ON c.id=a."approvalRevisionId" WHERE link."versionId"=vid AND (c.status<>'APPROVED' OR NOT c."syntheticOnly" OR p."mealRevisionId"=a."approvalRevisionId")) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM "TaskDefinition" t JOIN "PlanMeal" p ON p.id=t."planMealId" WHERE t."versionId"=vid AND (t.type<>'MEAL' OR p."dayIndex"<>(SELECT "dayIndex" FROM "ProgramDay" WHERE id=t."programDayId") OR NOT EXISTS(SELECT 1 FROM "ProgramNutritionPlan" l WHERE l."versionId"=vid AND l."planId"=p."planId"))) OR EXISTS(SELECT 1 FROM "TaskDefinition" WHERE "versionId"=vid AND type='MEAL' AND "planMealId" IS NULL) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM "Meal" m WHERE m."contentRevisionId" IN(SELECT p."mealRevisionId" FROM "PlanMeal" p JOIN "ProgramNutritionPlan" l ON l."planId"=p."planId" WHERE l."versionId"=vid UNION SELECT a."approvalRevisionId" FROM "MealAlternative" a JOIN "PlanMeal" p ON p.id=a."planMealId" JOIN "ProgramNutritionPlan" l ON l."planId"=p."planId" WHERE l."versionId"=vid) AND (NOT EXISTS(SELECT 1 FROM "MealIngredient" i WHERE i."mealId"=m.id) OR EXISTS(SELECT 1 FROM "MealIngredient" i WHERE i."mealId"=m.id AND (i."measurementBasis"='UNSPECIFIED' OR i.unit IN('SPOON','HANDFUL'))))) THEN RETURN false; END IF;
 RETURN true;
END $$;
-- Preserve the P2 immutability/transition logic, replacing only the earlier
-- fail-closed nutrition gate with the complete synthetic-only final check.
DO $$ DECLARE body text; BEGIN SELECT pg_get_functiondef('program_integrity()'::regprocedure) INTO body; body=replace(body,'IF EXISTS(SELECT 1 FROM "TaskDefinition" WHERE "versionId"=NEW.id AND (type=''MEAL'' OR "planMealId" IS NOT NULL)) OR EXISTS(SELECT 1 FROM "ProgramNutritionPlan" WHERE "versionId"=NEW.id) THEN','IF NOT p4_nutrition_ready(NEW.id) THEN');EXECUTE body; END $$;
REVOKE ALL ON FUNCTION p4_nutrition_ready(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p4_nutrition_ready(uuid) TO ghidai_app;
RESET ROLE;
COMMIT;
