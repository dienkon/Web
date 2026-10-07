import { describe, it, expect } from 'vitest';
import { validateProgram, ReactionProgram } from '../src/shared/programSchema';
import { EFFECT_ATOM_CATALOG } from '../src/vfx/catalog/index';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library/index';

describe('Reaction Programs Formal Validation Suite (§7.4 & §11.1)', () => {
  const catalogAtomNames = new Set(EFFECT_ATOM_CATALOG.map(a => a.name));

  it('validates that all 100+ handcrafted library programs strictly pass validateProgram', () => {
    for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
      const res = validateProgram(prog);
      expect(res.valid, `Program ${prog.id} failed validation: ${res.errors.join(', ')}`).toBe(true);
      expect(res.program).toBeDefined();

      // Ensure timeline atoms are in closed catalog
      for (const inst of prog.visual.timeline) {
        expect(catalogAtomNames.has(inst.atom), `Atom ${inst.atom} in ${prog.id} not in catalog`).toBe(true);
      }

      // Max 24 atoms check
      expect(prog.visual.timeline.length).toBeLessThanOrEqual(24);
    }
  });

  it('detects and reports invalid / unknown atom names in a program', () => {
    const invalidProgram: any = {
      schema: 'chemdex.program/1',
      id: 'bad_atom_test',
      provenance: 'ai',
      chemistry: {
        equation: 'A + B -> C',
        species: [
          { formula: 'A', role: 'reactant', coeff: 1, phase: 'aq' },
          { formula: 'B', role: 'reactant', coeff: 1, phase: 'aq' },
          { formula: 'C', role: 'product', coeff: 1, phase: 's' }
        ],
        kinetics: { model: 'instant', halfTime_s: 1.0 }
      },
      visual: {
        duration_s: 5.0,
        timeline: [
          { id: '1', atom: 'totallyFakeNonExistentAtom', anchor: 'bulk', window: [0, 1], intensity: 1, params: {} }
        ],
        after: { liquidColor: '#ffffff', liquidOpacity: 1, turbidity: 0, gasesOffgassed: [] }
      },
      explain: { observation_vi: '', observation_en: '', why_vi: '', why_en: '' },
      confidence: 0.9
    };

    const res = validateProgram(invalidProgram);
    // Validator detects and reports the invalid atom
    expect(res.errors.some(e => e.includes('totallyFakeNonExistentAtom'))).toBe(true);
    // Programmatic repair dropped the invalid atom
    expect(res.program?.visual.timeline.length).toBe(0);
  });

  it('auto-repairs malformed LLM outputs: missing schema, provenance, or unnormalized hex colors', () => {
    const messyLLMOutput: any = {
      id: 'raw_llm_neutralize',
      chemistry: {
        equation: 'HCl + NaOH -> NaCl + H2O',
        species: [
          { formula: 'HCl', role: 'reactant', coeff: 1, phase: 'aq' },
          { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 'aq' },
          { formula: 'NaCl', role: 'product', coeff: 1, phase: 'aq' }
        ]
      },
      visual: {
        duration_s: 4.0,
        timeline: [],
        after: {
          liquidColor: '#FFF', // 3-character hex
          liquidOpacity: 1.0,
          turbidity: 0.0
        }
      },
      explain: { observation_vi: 'Trộn đều', observation_en: 'Mixed', why_vi: '', why_en: '' }
    };

    const res = validateProgram(messyLLMOutput);
    expect(res.valid).toBe(true);
    expect(res.program?.schema).toBe('chemdex.program/1');
    expect(res.program?.provenance).toBe('ai');
    expect(res.program?.visual.after.liquidColor).toBe('#ffffff'); // Repaired to 6-char hex
  });

  it('enforces maximum 24 timeline atoms constraint by truncating excess atoms', () => {
    const excessiveAtoms: any[] = [];
    for (let i = 0; i < 30; i++) {
      excessiveAtoms.push({
        id: `atom_${i}`,
        atom: 'beerLambertBlend',
        anchor: 'bulk',
        window: [0, 1],
        intensity: 1,
        params: {}
      });
    }

    const bloatedProg: any = {
      schema: 'chemdex.program/1',
      id: 'bloated_program',
      provenance: 'ai',
      chemistry: { equation: 'X -> Y', species: [] },
      visual: {
        duration_s: 5.0,
        timeline: excessiveAtoms,
        after: { liquidColor: '#ffffff', liquidOpacity: 1, turbidity: 0, gasesOffgassed: [] }
      },
      explain: { observation_vi: '', observation_en: '', why_vi: '', why_en: '' }
    };

    const res = validateProgram(bloatedProg);
    expect(res.valid).toBe(true);
    expect(res.program?.visual.timeline.length).toBeLessThanOrEqual(24);
  });
});
