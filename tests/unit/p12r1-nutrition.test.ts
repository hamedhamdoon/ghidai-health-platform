import {describe,it,expect} from 'vitest';
import {mealSelectionInput} from '../../src/server/participation/nutrition';
describe('P12-R1 meal selection contract',()=>{
 it('accepts only base null or an explicit alternative UUID',()=>{expect(mealSelectionInput({alternativeMealId:null})).toEqual({alternativeMealId:null});expect(mealSelectionInput({alternativeMealId:'11111111-1111-4111-8111-111111111111'})).toEqual({alternativeMealId:'11111111-1111-4111-8111-111111111111'});});
 it('rejects identity/plan injection, missing choice and invalid identifiers',()=>{for(const input of [{},{alternativeMealId:''},{alternativeMealId:null,userId:'forged'},{alternativeMealId:null,planMealId:'forged'},null,[]])expect(()=>mealSelectionInput(input)).toThrow();});
});
