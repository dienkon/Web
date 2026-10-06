import { describe, it, expect } from 'vitest';
import { validateProgram } from '../src/shared/programSchema';
import { safeParseJson } from '../server/ai';
import { resolveReactionProgram } from '../src/vfx/programs/resolver';

describe('AI Effect-Director Fuzz & Robustness Suite (§7.11 & §11.1)', () => {
  describe('safeParseJson Resiliency Against Corrupted Inputs', () => {
    it('handles markdown codeblocks, raw backslashes and LaTeX escapes gracefully', () => {
      const rawMarkdown = '```json\n{"reaction_id": "test", "val": 123}\n```';
      const parsed = safeParseJson(rawMarkdown);
      expect(parsed).toEqual({ reaction_id: 'test', val: 123 });

      // LaTeX math escapes inside chemical strings
      const rawWithLatex = '{"formula": "CuSO_4", "desc": "deltaH = \\Delta H" }';
      const parsedLatex = safeParseJson(rawWithLatex);
      expect(parsedLatex.formula).toBe('CuSO_4');
    });

    it('rejects completely invalid non-JSON garbage by throwing standard SyntaxError', () => {
      const badInputs = [
        '<html><body>502 Bad Gateway</body></html>',
        'Not a json at all',
        'undefined',
        '{ truncated: '
      ];

      for (const input of badInputs) {
        expect(() => safeParseJson(input)).toThrow();
      }
    });
  });

  describe('Fuzz Testing validateProgram', () => {
    it('gracefully handles null, undefined, primitive, and empty inputs without crashing', () => {
      const fuzzInputs = [
        null,
        undefined,
        123,
        'string instead of object',
        [],
        {},
        { randomField: true },
        { id: null, chemistry: 42 }
      ];

      for (const input of fuzzInputs) {
        expect(() => {
          const res = validateProgram(input);
          expect(typeof res.valid).toBe('boolean');
          expect(Array.isArray(res.errors)).toBe(true);
        }).not.toThrow();
      }
    });

    it('gracefully handles absurd colors by falling back to safe default hex (#ffffff)', () => {
      const absurdColorProgram: any = {
        schema: 'chemdex.program/1',
        id: 'absurd_color',
        provenance: 'ai',
        chemistry: { equation: 'A -> B', species: [] },
        visual: {
          duration_s: 5.0,
          timeline: [],
          after: {
            liquidColor: 'rgb(not, a, hex)',
            liquidOpacity: 1.0,
            turbidity: 0.0,
            precipitate: { substance: 'X', morphology: 'curd', color: 'rainbow_sparkles', mass_g: 'fromLedger' }
          }
        },
        explain: { observation_vi: '', observation_en: '', why_vi: '', why_en: '' }
      };

      const res = validateProgram(absurdColorProgram);
      expect(res.valid).toBe(true);
      expect(res.program?.visual.after.liquidColor).toBe('#ffffff');
      expect(res.program?.visual.after.precipitate?.color).toBe('#ffffff');
    });

    it('gracefully repairs inverted timeline window intervals [end, start]', () => {
      const invertedWindowProg: any = {
        schema: 'chemdex.program/1',
        id: 'inverted_window',
        provenance: 'ai',
        chemistry: { equation: 'A -> B', species: [] },
        visual: {
          duration_s: 5.0,
          timeline: [
            { id: '1', atom: 'beerLambertBlend', anchor: 'bulk', window: [0.8, 0.2], intensity: 1, params: {} }
          ],
          after: { liquidColor: '#ffffff', liquidOpacity: 1, turbidity: 0, gasesOffgassed: [] }
        },
        explain: { observation_vi: '', observation_en: '', why_vi: '', why_en: '' }
      };

      const res = validateProgram(invertedWindowProg);
      expect(res.valid).toBe(true);
      expect(res.program?.visual.timeline[0].window).toEqual([0.2, 0.8]);
    });
  });

  describe('Resolver Fallback Guarantee', () => {
    it('always returns a valid, safe fallback program for bizarre unknown inputs without throwing', async () => {
      const bizarreSubstances = ['Unobtainium', 'Kryptonite', 'DarkMatter'];
      const result = await resolveReactionProgram(bizarreSubstances, []);

      expect(result).toBeDefined();
      expect(result.program).toBeDefined();
      expect(result.provenance).toBe('fallback');
      expect(result.program.schema).toBe('chemdex.program/1');
      expect(result.program.visual.timeline.length).toBeGreaterThanOrEqual(1);
    });
  });
});
