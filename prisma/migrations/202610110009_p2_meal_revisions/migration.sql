BEGIN;
SET ROLE ghidai_owner;
ALTER TABLE "Meal" ADD UNIQUE(id,"contentRevisionId");
ALTER TABLE "PlanMeal" ADD FOREIGN KEY("mealRevisionId") REFERENCES "Meal"("contentRevisionId") ON DELETE RESTRICT;
ALTER TABLE "MealAlternative" ADD FOREIGN KEY("alternativeMealId","approvalRevisionId") REFERENCES "Meal"(id,"contentRevisionId") ON DELETE RESTRICT;
CREATE INDEX alternative_revision_idx ON "MealAlternative"("alternativeMealId","approvalRevisionId");
CREATE FUNCTION ingredient_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM "MealIngredient" mi JOIN "Meal" m ON m.id=mi."mealId" JOIN "ContentRevision" c ON c.id=m."contentRevisionId" WHERE mi."ingredientId"=OLD.id AND c.status IN ('APPROVED','WITHDRAWN')) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='IMMUTABLE_APPROVED_INGREDIENT'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER ingredient_version_guard BEFORE UPDATE OR DELETE ON "Ingredient" FOR EACH ROW EXECUTE FUNCTION ingredient_version_guard();
REVOKE ALL ON FUNCTION ingredient_version_guard() FROM PUBLIC;
RESET ROLE;
COMMIT;
