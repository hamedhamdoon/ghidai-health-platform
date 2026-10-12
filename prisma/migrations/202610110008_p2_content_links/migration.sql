BEGIN;
SET ROLE ghidai_owner;
CREATE FUNCTION approved_nutrition_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid uuid; old_rid uuid;
BEGIN
  IF TG_TABLE_NAME IN ('Meal','NutritionPlan') THEN
    IF TG_OP<>'INSERT' THEN old_rid=OLD."contentRevisionId"; END IF;
    IF TG_OP<>'DELETE' THEN rid=NEW."contentRevisionId"; END IF;
  ELSIF TG_TABLE_NAME='MealIngredient' THEN
    IF TG_OP<>'INSERT' THEN SELECT "contentRevisionId" INTO old_rid FROM "Meal" WHERE id=OLD."mealId"; END IF;
    IF TG_OP<>'DELETE' THEN SELECT "contentRevisionId" INTO rid FROM "Meal" WHERE id=NEW."mealId"; END IF;
  ELSIF TG_TABLE_NAME='PlanMeal' THEN
    IF TG_OP<>'INSERT' THEN SELECT "contentRevisionId" INTO old_rid FROM "NutritionPlan" WHERE id=OLD."planId"; END IF;
    IF TG_OP<>'DELETE' THEN SELECT "contentRevisionId" INTO rid FROM "NutritionPlan" WHERE id=NEW."planId"; END IF;
  ELSIF TG_TABLE_NAME='MealAlternative' THEN
    IF TG_OP<>'INSERT' THEN SELECT n."contentRevisionId" INTO old_rid FROM "PlanMeal" p JOIN "NutritionPlan" n ON n.id=p."planId" WHERE p.id=OLD."planMealId"; END IF;
    IF TG_OP<>'DELETE' THEN SELECT n."contentRevisionId" INTO rid FROM "PlanMeal" p JOIN "NutritionPlan" n ON n.id=p."planId" WHERE p.id=NEW."planMealId"; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM "ContentRevision" WHERE id IN(rid,old_rid) AND status IN ('APPROVED','WITHDRAWN')) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_NUTRITION_LINK'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER meal_guard BEFORE INSERT OR UPDATE OR DELETE ON "Meal" FOR EACH ROW EXECUTE FUNCTION approved_nutrition_guard();
CREATE TRIGGER plan_guard BEFORE INSERT OR UPDATE OR DELETE ON "NutritionPlan" FOR EACH ROW EXECUTE FUNCTION approved_nutrition_guard();
CREATE TRIGGER ingredient_link_guard BEFORE INSERT OR UPDATE OR DELETE ON "MealIngredient" FOR EACH ROW EXECUTE FUNCTION approved_nutrition_guard();
CREATE TRIGGER plan_meal_guard BEFORE INSERT OR UPDATE OR DELETE ON "PlanMeal" FOR EACH ROW EXECUTE FUNCTION approved_nutrition_guard();
CREATE TRIGGER alternative_guard BEFORE INSERT OR UPDATE OR DELETE ON "MealAlternative" FOR EACH ROW EXECUTE FUNCTION approved_nutrition_guard();
REVOKE ALL ON FUNCTION approved_nutrition_guard() FROM PUBLIC;
RESET ROLE;
COMMIT;
