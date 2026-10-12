BEGIN;
SET ROLE ghidai_owner;
-- Freeze the complete submitted graph, not only its text; lock the same parent
-- as the publication transaction so a concurrent child edit cannot slip through.
CREATE FUNCTION p4_lock_program_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v uuid; s "VersionStatus";
BEGIN
 IF TG_OP='DELETE' THEN v=OLD."versionId"; ELSE v=NEW."versionId"; END IF;
 SELECT status INTO s FROM "ProgramVersion" WHERE id=v FOR UPDATE;
 IF s<>'DRAFT' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='DRAFT_REQUIRED'; END IF;
 IF TG_OP='UPDATE' AND OLD."versionId"<>NEW."versionId" THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_PARENT'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['ProgramDay','TaskDefinition','RecurrenceDefinition','ProgramNutritionPlan','ProgramAchievementRule'] LOOP EXECUTE format('CREATE TRIGGER p4_lock_parent BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION p4_lock_program_child()',t); END LOOP; END $$;
CREATE FUNCTION p4_lock_content_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid uuid; s "ContentStatus";
BEGIN
 IF TG_TABLE_NAME='ContentSource' THEN IF TG_OP='DELETE' THEN rid=OLD."revisionId"; ELSE rid=NEW."revisionId"; END IF;
 ELSIF TG_TABLE_NAME IN('Meal','NutritionPlan') THEN IF TG_OP='DELETE' THEN rid=OLD."contentRevisionId"; ELSE rid=NEW."contentRevisionId"; END IF;
 ELSIF TG_TABLE_NAME='MealIngredient' THEN SELECT "contentRevisionId" INTO rid FROM "Meal" WHERE id=NEW."mealId";
 ELSIF TG_TABLE_NAME='PlanMeal' THEN SELECT "contentRevisionId" INTO rid FROM "NutritionPlan" WHERE id=NEW."planId";
 ELSIF TG_TABLE_NAME='MealAlternative' THEN SELECT n."contentRevisionId" INTO rid FROM "PlanMeal" p JOIN "NutritionPlan" n ON n.id=p."planId" WHERE p.id=NEW."planMealId";
 END IF;
 SELECT status INTO s FROM "ContentRevision" WHERE id=rid FOR UPDATE;
 IF s<>'DRAFT' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='NEW_REVISION_REQUIRED'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['ContentSource','Meal','MealIngredient','NutritionPlan','PlanMeal','MealAlternative'] LOOP EXECUTE format('CREATE TRIGGER p4_content_parent BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION p4_lock_content_child()',t); END LOOP; END $$;
CREATE FUNCTION p4_freeze_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.status='IN_REVIEW' AND (to_jsonb(NEW)-'status'-'revision'-'updatedAt'-'publishedAt')<>(to_jsonb(OLD)-'status'-'revision'-'updatedAt'-'publishedAt') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='RETURN_TO_DRAFT_REQUIRED'; END IF; RETURN NEW; END $$;
CREATE TRIGGER p4_freeze_review BEFORE UPDATE ON "ProgramVersion" FOR EACH ROW EXECUTE FUNCTION p4_freeze_review();
DROP POLICY p4_program_read ON "Program";
CREATE POLICY p4_program_read ON "Program" FOR SELECT TO ghidai_app USING((p4_staff() AND (p4_admin() OR "ownerId"=actor_id())) OR (active_actor() AND status<>'ARCHIVED' AND EXISTS(SELECT 1 FROM "ProgramVersion" v WHERE v."programId"="Program".id AND v.status='PUBLISHED')));
CREATE FUNCTION p4_visible_version(vid uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN RETURN EXISTS(SELECT 1 FROM "ProgramVersion" v JOIN "Program" p ON p.id=v."programId" JOIN "ContentRevision" c ON c.id=v."descriptionRevisionId" WHERE v.id=vid AND v.status='PUBLISHED' AND p.status<>'ARCHIVED' AND c.status='APPROVED') AND NOT EXISTS(SELECT 1 FROM "TaskDefinition" t JOIN "ContentRevision" c ON c.id=t."titleRevisionId" WHERE t."versionId"=vid AND c.status<>'APPROVED'); END $$;
RESET ROLE;
GRANT SELECT ON "TaskDefinition" TO ghidai_policy;
ALTER FUNCTION p4_visible_version(uuid) OWNER TO ghidai_policy;
SET ROLE ghidai_owner;
REVOKE ALL ON FUNCTION p4_visible_version(uuid),p4_lock_program_child(),p4_lock_content_child(),p4_freeze_review() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p4_visible_version(uuid) TO ghidai_app,ghidai_policy;
DROP POLICY p4_version_read ON "ProgramVersion";
CREATE FUNCTION p4_owned_program(pid uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET row_security=off AS $$ BEGIN RETURN EXISTS(SELECT 1 FROM "Program" WHERE id=pid AND "ownerId"=actor_id()); END $$;
RESET ROLE; ALTER FUNCTION p4_owned_program(uuid) OWNER TO ghidai_policy; SET ROLE ghidai_owner;
REVOKE ALL ON FUNCTION p4_owned_program(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION p4_owned_program(uuid) TO ghidai_app,ghidai_policy;
CREATE POLICY p4_version_read ON "ProgramVersion" FOR SELECT TO ghidai_app USING((p4_staff() AND (p4_admin() OR p4_owned_program("programId"))) OR (active_actor() AND p4_visible_version(id)));
-- Ingredient names/units are part of the reviewed content graph.
CREATE FUNCTION p4_ingredient_freeze() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM "MealIngredient" mi JOIN "Meal" m ON m.id=mi."mealId" JOIN "ContentRevision" c ON c.id=m."contentRevisionId" WHERE mi."ingredientId"=OLD.id AND c.status<>'DRAFT') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_REVIEWED_INGREDIENT'; END IF; IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$;
CREATE TRIGGER p4_ingredient_freeze BEFORE UPDATE OR DELETE ON "Ingredient" FOR EACH ROW EXECUTE FUNCTION p4_ingredient_freeze();
REVOKE ALL ON FUNCTION p4_ingredient_freeze() FROM PUBLIC;
RESET ROLE;
COMMIT;
