import {it,expect} from 'vitest';
import {exerciseFinished} from '../../src/server/tracking/rules';
it('only a finished exercise duration can contribute to logged completion',()=>{const now=Date.parse('2026-10-13T12:00:00Z');expect(exerciseFinished('2026-10-13T11:50:00Z',10,now)).toBe(true);expect(exerciseFinished('2026-10-13T11:59:59Z',1440,now)).toBe(false);expect(exerciseFinished('2026-10-13T11:50:01Z',10,now)).toBe(false);});
