BEGIN;
-- The existing visibility function is owned by the restricted policy role.
RESET ROLE;
CREATE OR REPLACE FUNCTION p4_visible_version(vid uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN
 RETURN EXISTS(SELECT 1 FROM "ProgramVersion" v JOIN "Program" p ON p.id=v."programId" JOIN "ContentRevision" c ON c.id=v."descriptionRevisionId" WHERE v.id=vid AND v.status='PUBLISHED' AND p.status<>'ARCHIVED' AND c.status='APPROVED') AND NOT EXISTS(SELECT 1 FROM "TaskDefinition" t JOIN "ContentRevision" c ON c.id=t."titleRevisionId" WHERE t."versionId"=vid AND c.status<>'APPROVED') AND p4_nutrition_ready(vid);
END $$;
RESET ROLE;
GRANT SELECT ON "ProgramDay","ProgramNutritionPlan","NutritionPlan","PlanMeal","MealAlternative","Meal","MealIngredient" TO ghidai_policy;
GRANT EXECUTE ON FUNCTION p4_nutrition_ready(uuid) TO ghidai_policy;
ALTER FUNCTION p4_visible_version(uuid) OWNER TO ghidai_policy;
COMMIT;
